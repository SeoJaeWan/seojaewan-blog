import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcutNavigationPort,
  type HeadlessRuntime,
  type HeadlessRuntimeAdapters,
  type ResourceReaders,
  type SearchRecentStorage,
  selectSearchRecommendations,
  selectTaskbarSearchResults,
  TaskbarSearchStore,
  type WorkspaceState,
} from "../headless/index.js";
import { TaskbarSearchStore as FeatureSearchStore } from "../headless/taskbar/index.js";

/** テストで決定的な Resource UUIDを発行する。 */
const id = (number: number) => `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const folderA = createResourceRef("folder", id(101));
const folderB = createResourceRef("folder", id(102));
const shortcut = {
  ref: createResourceRef("external-shortcut", id(201)),
  name: "Example",
  url: "https://example.com/search",
};

/** 최신 추천과 검색용 Content 원본을 고정한다. */
const contentFor = (number: number, date = "2026-09-12"): Content => ({
  ref: createResourceRef("content", id(number)),
  title: `문서 ${number}`,
  slug: `entry-${number}`,
  summary: "",
  date,
  tags: ["검색"],
  cover: null,
  source: { kind: "notion", pageId: `page-${number}` },
});
const contents = Array.from({ length: 25 }, (_, index) => contentFor(index + 1));
const readers: ResourceReaders = {
  content: createStaticCatalog(contents),
  folder: createStaticCatalog([
    { ref: folderA, name: "A" },
    { ref: folderB, name: "B" },
  ]),
  externalShortcut: createStaticCatalog([shortcut]),
};

/** 독립 Store에 current reader, storage port와 고정 clock을 연결한다. */
const createStore = (storage?: SearchRecentStorage) => {
  let ready = true;
  let currentReaders = readers;
  let time = 100;
  const store = new TaskbarSearchStore({
    resources: { getReaders: () => (ready ? currentReaders : null) },
    storage,
    clock: { now: () => ++time },
  });
  return {
    store,
    setReady: (value: boolean) => {
      ready = value;
    },
    setReaders: (value: ResourceReaders) => {
      currentReaders = value;
    },
  };
};

/** 실제 WindowStore와 공개 runtime Action으로 headless 통합 fixture를 구성한다. */
const createRuntimeFixture = async (
  externalNavigation?: ExternalShortcutNavigationPort,
  storage?: SearchRecentStorage,
) => {
  vi.resetModules();
  const api = await import("../headless/index.js");
  let currentWorkspace: WorkspaceState = {
    schemaVersion: 1,
    contentInbox: folderA,
    folders: readers.folder.list(),
    placements: [
      { resource: folderA, parent: null },
      { resource: folderB, parent: null },
      ...contents.map((content) => ({ resource: content.ref, parent: folderA })),
      { resource: shortcut.ref, parent: null },
    ],
  };
  const workspace = {
    getSnapshot: () => currentWorkspace,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["workspace"]>;
  await api.WindowStore.initialize({
    workspace,
    contentCatalog: readers.content,
    mode: "desktop",
    workArea: { x: 0, y: 0, width: 1280, height: 720 },
    placementConfig: {
      defaultSize: { width: 600, height: 400 },
      minSize: { width: 320, height: 200 },
      edgeMargin: 10,
      cascadeOffset: { x: 30, y: 20 },
      titlebarRecoverySize: { width: 120, height: 32 },
    },
  });
  const transitions = new api.TransitionRegistry();
  const originalWait = transitions.waitFor.bind(transitions);
  let autoComplete = true;
  const waits = vi
    .spyOn(transitions, "waitFor")
    .mockImplementation((operationId, phase, options) => {
      const pending = originalWait(operationId, phase, options);
      if (autoComplete) transitions.complete(operationId, phase);
      return pending;
    });
  let time = 1000;
  const save = vi.fn(() => Promise.resolve());
  const runtime = api.createHeadlessRuntime({
    adapters: { windows: api.WindowStore, workspace },
    transitions,
    fileExplorerResources: { content: readers.content, externalShortcut: readers.externalShortcut },
    externalNavigation: externalNavigation ?? { openNewTab: () => ({ status: "succeeded" }) },
    searchStorage: storage ?? { load: () => null, save },
    searchClock: { now: () => ++time },
  });
  await runtime.search.initialize();
  return {
    api,
    runtime,
    save,
    waits,
    transitions,
    setAutoComplete: (value: boolean) => {
      autoComplete = value;
    },
    move: (parent: typeof folderA | null) => {
      currentWorkspace = {
        ...currentWorkspace,
        placements: currentWorkspace.placements.map((placement) =>
          placement.resource.id === contents[0].ref.id ? { ...placement, parent } : placement,
        ),
      };
    },
  };
};

/** raw query Action과 같은 revision으로 검색을 적용한다. */
const apply = async (runtime: HeadlessRuntime, panel: "start" | "search", query: string) => {
  await runtime.primaryPanel.execute({ type: "update-query", panel, query }).settled;
  const version = runtime.search.getSnapshot().panels[panel].version;
  await runtime.search.execute({ type: "search.apply-query", panel, query, version });
};

describe("TaskbarSearchStore public contract", () => {
  it("public entryは同じStoreを公開し20件・dedupe・reopenをsessionで保持する", async () => {
    expect(FeatureSearchStore).toBe(TaskbarSearchStore);
    const { store } = createStore();
    await store.initialize();
    for (const content of contents) await store.recordOpened(content.ref);
    expect(store.getSnapshot().recent.map((entry) => entry.resource)).toEqual(
      contents
        .slice(5)
        .reverse()
        .map((content) => content.ref),
    );
    await store.recordOpened(contents[10].ref);
    expect(store.getSnapshot().recent).toHaveLength(20);
    expect(store.getSnapshot().recent[0]).toEqual({ resource: contents[10].ref, openedAt: 126 });
    expect(
      store.getSnapshot().recent.filter((entry) => entry.resource.id === contents[10].ref.id),
    ).toHaveLength(1);
  });

  it("versioned load/save로 순서·dedupe·없는 ref 정리를 적용한다", async () => {
    const save = vi.fn(() => Promise.resolve());
    const load = vi.fn(() => ({
      schemaVersion: 1,
      recent: [
        { resource: contents[0].ref, openedAt: 1 },
        { resource: folderA, openedAt: 3 },
        { resource: contents[0].ref, openedAt: 4 },
        { resource: createResourceRef("content", id(999)), openedAt: 5 },
        { resource: shortcut.ref, openedAt: 2 },
        { resource: { kind: "bad", id: "bad" }, openedAt: 6 },
      ],
    }));
    const { store, setReaders } = createStore({ load, save });
    const initialization = store.initialize();
    expect(store.initialize()).toBe(initialization);
    await initialization;
    expect(load).toHaveBeenCalledOnce();
    expect(store.getSnapshot().recent.map((entry) => entry.resource)).toEqual([
      contents[0].ref,
      folderA,
      shortcut.ref,
    ]);
    expect(save).toHaveBeenCalledExactlyOnceWith({
      schemaVersion: 1,
      recent: store.getSnapshot().recent,
    });
    setReaders({ ...readers, folder: createStaticCatalog([]) });
    expect(await store.execute({ type: "search.reconcile" })).toEqual({
      changed: true,
      persistence: "saved",
    });
    expect(store.getSnapshot().recent.map((entry) => entry.resource)).toEqual([
      contents[0].ref,
      shortcut.ref,
    ]);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("Catalog·Workspace 준비 전에는 복원·정리하지 않고 복원 후 세션 기록을 합친다", async () => {
    const load = vi.fn(() => ({ schemaVersion: 1, recent: [{ resource: folderA, openedAt: 1 }] }));
    const save = vi.fn(() => Promise.resolve());
    const { store, setReady } = createStore({ load, save });
    setReady(false);
    expect(await store.initialize()).toBe(false);
    await store.recordOpened(contents[0].ref);
    expect(await store.execute({ type: "search.reconcile" })).toEqual({
      changed: false,
      persistence: "not-required",
    });
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    setReady(true);
    expect(await store.initialize()).toBe(true);
    expect(store.getSnapshot().recent.map((entry) => entry.resource)).toEqual([
      contents[0].ref,
      folderA,
    ]);
  });

  it("save reject에도 세션을 되돌리지 않고 다음 기록을 저장 port로 보낸다", async () => {
    const save = vi.fn(() => Promise.reject(new Error("storage unavailable")));
    const { store } = createStore({ load: () => null, save });
    await store.initialize();
    expect(await store.recordOpened(contents[0].ref)).toEqual({
      changed: true,
      persistence: "failed",
    });
    expect(await store.recordOpened(folderA)).toEqual({ changed: true, persistence: "failed" });
    expect(store.getSnapshot().recent.map((entry) => entry.resource)).toEqual([
      folderA,
      contents[0].ref,
    ]);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it.each([
    null,
    { schemaVersion: 2, recent: [{ resource: folderA, openedAt: 1 }] },
    { schemaVersion: 1, recent: "bad" },
  ])("읽을 수 없는 schema를 빈 dataset으로 복원한다: %j", async (value) => {
    const { store } = createStore({ load: () => value, save: () => undefined });
    await store.initialize();
    expect(store.getSnapshot().recent).toEqual([]);
  });

  it("최신 6개 추천은 date 내림차순·id 동률 순서로 입력 순서와 무관하다", () => {
    const content = createStaticCatalog(
      [...contents.slice(0, 8)]
        .reverse()
        .map((entry, index) => ({ ...entry, date: index < 2 ? "2026-09-11" : "2026-09-12" })),
    );
    expect(selectSearchRecommendations({ ...readers, content })).toEqual(
      contents.slice(0, 6).map((entry) => entry.ref),
    );
    expect(selectSearchRecommendations({ ...readers, content: createStaticCatalog([]) })).toEqual(
      [],
    );
  });
});

describe("TaskbarSearchStore additional public contract", () => {
  it("복원은 최대 20개를 유지하고 load rejection을 빈 기록으로 복구한다", async () => {
    const loaded = createStore({
      load: () => ({
        schemaVersion: 1,
        recent: contents.map((entry, index) => ({ resource: entry.ref, openedAt: index })),
      }),
      save: () => undefined,
    });
    await loaded.store.initialize();
    expect(loaded.store.getSnapshot().recent.map((entry) => entry.resource)).toEqual(
      contents
        .slice(5)
        .reverse()
        .map((entry) => entry.ref),
    );
    const rejected = createStore({
      load: () => Promise.reject(new Error("load failed")),
      save: () => undefined,
    });
    await rejected.store.initialize();
    expect(rejected.store.getSnapshot().recent).toEqual([]);
  });

  it("기본 화면의 추천 detail은 기록 없이 열고 뒤로는 적용 query와 recent를 보존한다", async () => {
    const { store } = createStore();
    const recent = store.getSnapshot().recent;
    expect(
      await store.execute({
        type: "search.show-detail",
        panel: "search",
        resource: contents[0].ref,
      }),
    ).toMatchObject({ changed: true });
    expect(store.getSnapshot().panels.search.detail).toEqual(contents[0].ref);
    await store.execute({ type: "search.hide-detail", panel: "search" });
    expect(store.getSnapshot().panels.search).toMatchObject({ query: "", detail: null });
    expect(store.getSnapshot().recent).toBe(recent);
  });
});

describe("createHeadlessRuntime Search public contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("queue 반영 전 연속 입력의 마지막 빈 query도 즉시 기본 화면으로 바꾼다", async () => {
    const { runtime } = await createRuntimeFixture();
    const first = runtime.primaryPanel.execute({
      type: "update-query",
      panel: "search",
      query: "문서",
    });
    const empty = runtime.primaryPanel.execute({
      type: "update-query",
      panel: "search",
      query: "",
    });
    expect(runtime.search.getSnapshot().panels.search).toMatchObject({
      query: "",
      pending: false,
      detail: null,
    });
    await first.settled;
    await empty.settled;
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({ snapshot: { searchQuery: "" } });
  });

  it("저장 port가 완료하지 않아도 실제 open 성공과 세션 기록을 반환한다", async () => {
    let saveCount = 0;
    let resolveSave!: () => void;
    const { runtime } = await createRuntimeFixture(undefined, {
      load: () => null,
      save: () =>
        ++saveCount === 1
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              resolveSave = resolve;
            }),
    });
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    expect(
      await runtime.search.execute({
        type: "search.open-resource",
        panel: "search",
        resource: shortcut.ref,
      }),
    ).toMatchObject({ status: "succeeded" });
    expect(runtime.search.getSnapshot().recent[0].resource).toEqual(shortcut.ref);
    await vi.waitFor(() => expect(saveCount).toBe(2));
    resolveSave();
  });

  it("SSR 생성·server snapshot은 singleton과 storage를 읽지 않는다", async () => {
    const load = vi.fn();
    const { createHeadlessRuntime } = await import("../headless/index.js");
    const runtime = createHeadlessRuntime({ searchStorage: { load, save: vi.fn() } });
    expect(runtime.search.getServerSnapshot()).toBe(runtime.search.getServerSnapshot());
    expect(runtime.search.getServerSnapshot().recent).toEqual([]);
    expect(await runtime.search.initialize()).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("raw 변경은 detail을 즉시 비우고 pending 동안 이전 결과와 실행 차단을 구분한다", async () => {
    const { runtime } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    await apply(runtime, "search", "문서");
    await runtime.search.execute({
      type: "search.show-detail",
      panel: "search",
      resource: contents[0].ref,
    });
    expect(runtime.search.getSnapshot().panels.search.detail).toEqual(contents[0].ref);
    const before = runtime.search.getSnapshot();
    const raw = runtime.primaryPanel.execute({
      type: "update-query",
      panel: "search",
      query: "새  입력 ",
    });
    const pending = runtime.search.getSnapshot();
    expect(pending.panels.search).toMatchObject({ query: "문서", pending: true, detail: null });
    expect(
      selectTaskbarSearchResults(pending, "search", runtime.search.getReaders()!),
    ).toHaveLength(25);
    expect(
      await runtime.search.execute({
        type: "search.open-resource",
        panel: "search",
        resource: contents[0].ref,
      }),
    ).toMatchObject({ status: "not-executed", reason: "pending-query" });
    expect(
      await runtime.search.execute({
        type: "search.apply-query",
        panel: "search",
        query: "문서",
        version: before.panels.search.version,
      }),
    ).toMatchObject({ changed: false });
    await raw.settled;
    expect(
      await runtime.search.execute({
        type: "search.apply-query",
        panel: "search",
        query: "wrong",
        version: pending.panels.search.version,
      }),
    ).toMatchObject({ changed: false });
    runtime.primaryPanel.execute({ type: "update-query", panel: "search", query: "  \t " });
    expect(runtime.search.getSnapshot().panels.search).toMatchObject({
      query: "",
      pending: false,
      detail: null,
    });
  });

  it("close 완료까지 detail·query를 유지하고 switch에서 해당 transient와 raw를 초기화한다", async () => {
    const { runtime, setAutoComplete, waits, transitions } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "start" }).settled;
    await apply(runtime, "start", "문서");
    await runtime.search.execute({
      type: "search.show-detail",
      panel: "start",
      resource: contents[0].ref,
    });
    const before = runtime.search.getSnapshot().panels.start;
    setAutoComplete(false);
    const switching = runtime.primaryPanel.execute({ type: "trigger", panel: "search" });
    await vi.waitFor(() =>
      expect(waits).toHaveBeenCalledWith(switching.operationId, "primary-panel-exit"),
    );
    expect(runtime.search.getSnapshot().panels.start).toBe(before);
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { startQuery: "문서", searchQuery: "" },
    });
    transitions.complete(switching.operationId, "primary-panel-exit");
    await switching.committed;
    expect(runtime.search.getSnapshot().panels.start).toMatchObject({
      query: "",
      detail: null,
      pending: false,
    });
    expect(runtime.search.getSnapshot().panels.search.query).toBe("");
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { activePanel: "search", startQuery: "", searchQuery: "" },
    });
    transitions.complete(switching.operationId, "primary-panel-enter");
    await switching.settled;
  });

  it("최신 parent Folder를 실제 WindowStore에서 열고 해당 Folder만 기록한다", async () => {
    const { runtime, move } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    move(folderB);
    expect(
      await runtime.search.execute({
        type: "search.open-file-location",
        panel: "search",
        resource: contents[0].ref,
      }),
    ).toMatchObject({ status: "succeeded", recentResource: folderB });
    expect(runtime.search.getSnapshot().recent.map((entry) => entry.resource)).toEqual([folderB]);
    const windows = runtime.windows.getSnapshot();
    expect(windows).toMatchObject({
      status: "ready",
      snapshot: {
        sessions: [
          {
            kind: "file-explorer",
            tabs: [
              { navigation: { current: { location: { kind: "location", location: folderB } } } },
            ],
          },
        ],
      },
    });
  });

  it("Desktop은 기존 Window Action으로 실제로 열고 recent에 기록하지 않는다", async () => {
    const { runtime, move } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "start" }).settled;
    move(null);
    expect(
      await runtime.search.execute({
        type: "search.open-file-location",
        panel: "start",
        resource: contents[0].ref,
      }),
    ).toMatchObject({
      status: "succeeded",
      recentResource: null,
      openResult: { action: { type: "create-file-explorer-window", location: null } },
    });
    expect(runtime.search.getSnapshot().recent).toEqual([]);
    expect(runtime.windows.getSnapshot()).toMatchObject({
      snapshot: {
        sessions: [
          {
            kind: "file-explorer",
            tabs: [{ navigation: { current: { location: { kind: "location", location: null } } } }],
          },
        ],
      },
    });
  });

  it("Window semantic commit만으로 recent와 성공 close를 진행하지 않고 표현 완료 후 기록한다", async () => {
    const { runtime, waits, transitions, setAutoComplete } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    setAutoComplete(false);
    const open = runtime.search.execute({
      type: "search.open-resource",
      panel: "search",
      resource: contents[0].ref,
    });
    await vi.waitFor(() =>
      expect(waits.mock.calls.some((call) => call[1] === "window-enter")).toBe(true),
    );
    expect(runtime.windows.getSnapshot()).toMatchObject({
      snapshot: { sessions: [{ kind: "chrome" }] },
    });
    expect(runtime.search.getSnapshot().recent).toEqual([]);
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { activePanel: "search" },
    });
    const windowWait = waits.mock.calls.find((call) => call[1] === "window-enter")!;
    transitions.complete(windowWait[0], windowWait[1]);
    expect(await open).toMatchObject({ status: "succeeded" });
    expect(runtime.search.getSnapshot().recent[0].resource).toEqual(contents[0].ref);
    await vi.waitFor(() =>
      expect(waits.mock.calls.some((call) => call[1] === "primary-panel-exit")).toBe(true),
    );
    const closeWait = waits.mock.calls.find((call) => call[1] === "primary-panel-exit")!;
    transitions.complete(closeWait[0], closeWait[1]);
  });

  it("save reject에도 실제 open 성공과 공유 recent를 유지한다", async () => {
    const save = vi.fn(() => Promise.reject(new Error("save failed")));
    const { runtime } = await createRuntimeFixture(undefined, { load: () => null, save });
    await runtime.primaryPanel.execute({ type: "trigger", panel: "start" }).settled;
    expect(
      await runtime.search.execute({
        type: "search.open-resource",
        panel: "start",
        resource: shortcut.ref,
      }),
    ).toMatchObject({ status: "succeeded", resource: shortcut.ref });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(runtime.search.getSnapshot().recent[0].resource).toEqual(shortcut.ref);
    await vi.waitFor(() =>
      expect(runtime.primaryPanel.getSnapshot()).toMatchObject({ snapshot: { activePanel: null } }),
    );
  });

  it("external throw는 query·detail·panel을 유지하고 recent에 기록하지 않는다", async () => {
    const openNewTab = vi.fn(() => {
      throw new Error("browser failed");
    });
    const { runtime } = await createRuntimeFixture({ openNewTab });
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    await apply(runtime, "search", "Example");
    await runtime.search.execute({
      type: "search.show-detail",
      panel: "search",
      resource: shortcut.ref,
    });
    const before = runtime.search.getSnapshot();
    expect(
      await runtime.search.execute({
        type: "search.open-resource",
        panel: "search",
        resource: shortcut.ref,
      }),
    ).toMatchObject({ status: "failed", openResult: { kind: "external-navigation-threw" } });
    expect(runtime.search.getSnapshot()).toBe(before);
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { activePanel: "search", searchQuery: "Example" },
    });
    expect(openNewTab).toHaveBeenCalledOnce();
  });

  it("닫힌 activation의 늦은 성공도 원본 external ref를 기록하고 새 panel을 유지한다", async () => {
    let resolve!: (value: { status: "succeeded" }) => void;
    const openNewTab = vi.fn(
      () =>
        new Promise<{ status: "succeeded" }>((done) => {
          resolve = done;
        }),
    );
    const { runtime } = await createRuntimeFixture({ openNewTab });
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    const unsubscribe = runtime.search.subscribe(() => undefined);
    const open = runtime.search.execute({
      type: "search.open-resource",
      panel: "search",
      resource: shortcut.ref,
    });
    await vi.waitFor(() => expect(openNewTab).toHaveBeenCalledOnce());
    await runtime.primaryPanel.execute({ type: "trigger", panel: "start" }).settled;
    unsubscribe();
    await apply(runtime, "start", "문서");
    resolve({ status: "succeeded" });
    expect(await open).toMatchObject({
      status: "succeeded",
      resource: shortcut.ref,
      recentResource: shortcut.ref,
    });
    expect(runtime.search.getSnapshot().recent.map((entry) => entry.resource)).toEqual([
      shortcut.ref,
    ]);
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { activePanel: "start", startQuery: "문서" },
    });
    expect(runtime.search.getSnapshot().panels.start.query).toBe("문서");
  });

  it("target-satisfied Folder 성공도 기록하고 mobile은 두 입력을 비우며 recent를 유지한다", async () => {
    const { runtime } = await createRuntimeFixture();
    await runtime.primaryPanel.execute({ type: "trigger", panel: "search" }).settled;
    await runtime.search.execute({
      type: "search.open-resource",
      panel: "search",
      resource: folderA,
    });
    await vi.waitFor(() =>
      expect(runtime.primaryPanel.getSnapshot()).toMatchObject({ snapshot: { activePanel: null } }),
    );
    await runtime.primaryPanel.execute({ type: "trigger", panel: "start" }).settled;
    expect(
      await runtime.search.execute({
        type: "search.open-resource",
        panel: "start",
        resource: folderA,
      }),
    ).toMatchObject({ status: "succeeded", openResult: { kind: "window-target-satisfied" } });
    await apply(runtime, "start", "문서");
    await apply(runtime, "search", "Example");
    const recent = runtime.search.getSnapshot().recent;
    await runtime.primaryPanel.execute({ type: "dismiss-for-mobile" }).settled;
    expect(runtime.search.getSnapshot().recent).toBe(recent);
    expect(runtime.search.getSnapshot().panels).toMatchObject({
      start: { query: "", detail: null, pending: false },
      search: { query: "", detail: null, pending: false },
    });
    expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
      snapshot: { activePanel: null, startQuery: "", searchQuery: "" },
    });
  });
});
