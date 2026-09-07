import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChromeLocation, InternalAddress } from "../../chrome/index.js";
import { type Content, createResourceRef, type FolderResourceRef } from "../../resources/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import type { WindowState } from "../model/index.js";

const uuid = (value: number) => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const folderA = createResourceRef("folder", "20000000-0000-4000-8000-000000000001");
const folderB = createResourceRef("folder", "20000000-0000-4000-8000-000000000002");
const contentA = createResourceRef("content", "30000000-0000-4000-8000-000000000001");
const contentB = createResourceRef("content", "30000000-0000-4000-8000-000000000002");

const contentFor = (ref: typeof contentA): Content => ({
  ref,
  title: ref.id,
  slug: ref.id,
  summary: "",
  date: "2026-09-07",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: ref.id },
});

const initialWorkspace: WorkspaceState = {
  schemaVersion: 1,
  contentInbox: folderA,
  folders: [
    { ref: folderA, name: "A" },
    { ref: folderB, name: "B" },
  ],
  placements: [
    { resource: folderA, parent: null },
    { resource: folderB, parent: folderA },
    { resource: contentA, parent: folderA },
    { resource: contentB, parent: folderB },
  ],
};

const setup = async (
  ids: readonly string[] = Array.from({ length: 80 }, (_, i) => uuid(i + 1)),
) => {
  vi.resetModules();
  const generated = [...ids];
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => generated.shift() ?? uuid(999)) });
  let workspaceState = initialWorkspace;
  const workspace = {
    getSnapshot: vi.fn(() => workspaceState),
  };
  const contentCatalog = {
    has: vi.fn((id) => id === contentA.id || id === contentB.id),
    get: vi.fn((id) =>
      id === contentA.id
        ? contentFor(contentA)
        : id === contentB.id
          ? contentFor(contentB)
          : undefined,
    ),
    list: vi.fn(() => [contentFor(contentA), contentFor(contentB)]),
  };
  const placementConfig = {
    defaultSize: { width: 600, height: 400 },
    minSize: { width: 320, height: 200 },
    edgeMargin: 10,
    cascadeOffset: { x: 30, y: 20 },
    titlebarRecoverySize: { width: 120, height: 32 },
  };
  const storeModule = await import("./index.js");
  const initialization = {
    workspace,
    contentCatalog,
    placementConfig,
    mode: "desktop" as const,
    workArea: { x: 0, y: 0, width: 1000, height: 800 },
  };

  return {
    ...storeModule,
    initialization,
    workspace,
    contentCatalog,
    setWorkspaceState: (next: WorkspaceState) => {
      workspaceState = next;
    },
  };
};

const sessionIds = (state: WindowState) => state.sessions.map(({ id }) => id);

describe("WindowStore", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("초기화 전 접근을 거부하고 동일 dependency 재사용과 빈 immutable snapshot을 제공한다", async () => {
    const { WindowStore, WindowStoreNotInitializedError, initialization } = await setup();

    expect(() => WindowStore.getSnapshot()).toThrow(WindowStoreNotInitializedError);
    expect(() => WindowStore.createChromeWindow()).toThrow(WindowStoreNotInitializedError);

    const first = await WindowStore.initialize(initialization);
    const snapshot = WindowStore.getSnapshot();
    expect(first).toMatchObject({ ok: true, changed: false, reason: "no-op", value: snapshot });
    expect(snapshot).toEqual({
      mode: "desktop",
      workArea: initialization.workArea,
      sessions: [],
      stackingOrder: [],
      activeSessionId: null,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.workArea)).toBe(true);
    expect(await WindowStore.initialize({ ...initialization })).toMatchObject({
      ok: true,
      changed: false,
    });
  });

  it("다른 dependency 재결합을 거부하고 기존 snapshot을 유지한다", async () => {
    const { WindowStore, WindowStoreAlreadyInitializedError, initialization } = await setup();
    await WindowStore.initialize(initialization);
    const before = WindowStore.getSnapshot();

    await expect(
      WindowStore.initialize({
        ...initialization,
        workspace: { getSnapshot: () => initialWorkspace },
      }),
    ).rejects.toBeInstanceOf(WindowStoreAlreadyInitializedError);
    expect(WindowStore.getSnapshot()).toBe(before);
  });

  it("초기 mode를 생략하면 browser 폭을 읽지 않고 desktop으로 시작한다", async () => {
    const { WindowStore, initialization } = await setup();
    const { mode: _mode, ...withoutMode } = initialization;

    await WindowStore.initialize(withoutMode);

    expect(WindowStore.getSnapshot().mode).toBe("desktop");
  });

  it("직렬 생성은 최신 snapshot에서 중앙·cascade 배치하고 순서대로 알린다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    const observed: number[] = [];
    WindowStore.subscribe(() => observed.push(WindowStore.getSnapshot().sessions.length));

    const first = WindowStore.createFileExplorerWindow(null);
    const second = WindowStore.createChromeWindow();
    await Promise.all([first, second]);

    const state = WindowStore.getSnapshot();
    expect(observed).toEqual([1, 2]);
    expect(state.sessions[0]?.frame.normalBounds).toEqual({
      x: 200,
      y: 200,
      width: 600,
      height: 400,
    });
    expect(state.sessions[1]?.frame.normalBounds).toEqual({
      x: 230,
      y: 220,
      width: 600,
      height: 400,
    });
    expect(state.stackingOrder).toEqual(sessionIds(state));
    expect(state.activeSessionId).toBe(state.sessions[1]?.id);
  });

  it("listener 오류를 격리하고 listener의 재진입 명령을 현재 commit 뒤에 실행한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    const events: string[] = [];
    let followUp: Promise<unknown> | undefined;
    WindowStore.subscribe(() => {
      events.push(`first:${WindowStore.getSnapshot().sessions.length}`);
      if (followUp === undefined) followUp = WindowStore.createChromeWindow();
    });
    WindowStore.subscribe(() => {
      throw new Error("listener failure");
    });
    const unsubscribe = WindowStore.subscribe(() => events.push("last"));

    await WindowStore.createFileExplorerWindow(null);
    await followUp;
    unsubscribe();
    await WindowStore.createChromeWindow();

    expect(events).toEqual(["first:1", "last", "first:2", "last", "first:3"]);
  });

  it("active와 inactive close·minimize에서 최상위 visible Session을 정확히 선택한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    await WindowStore.createFileExplorerWindow(null);
    await WindowStore.createChromeWindow();
    const [first, second, third] = sessionIds(WindowStore.getSnapshot());

    await WindowStore.minimize(second);
    expect(WindowStore.getSnapshot().activeSessionId).toBe(third);
    await WindowStore.close(first);
    expect(WindowStore.getSnapshot().activeSessionId).toBe(third);
    await WindowStore.close(third);
    expect(WindowStore.getSnapshot().activeSessionId).toBeNull();
    await WindowStore.activate(second);
    expect(WindowStore.getSnapshot()).toMatchObject({
      activeSessionId: second,
      stackingOrder: [second],
    });
    expect(WindowStore.getSnapshot().sessions[0]?.frame.minimized).toBe(false);
  });

  it("활성 tab 종료는 오른쪽 뒤 왼쪽을 선택하고 비활성 종료와 마지막 종료 규칙을 지킨다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    const session = WindowStore.getSnapshot().sessions[0];
    await WindowStore.addChromeTab(session.id);
    await WindowStore.addChromeTab(session.id);
    let chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome.kind !== "chrome") throw new Error("expected chrome");
    const [left, middle, right] = chrome.tabs.map(({ id }) => id);

    await WindowStore.activateChromeTab(chrome.id, middle);
    await WindowStore.closeChromeTab(chrome.id, middle);
    chrome = WindowStore.getSnapshot().sessions[0]!;
    if (chrome.kind !== "chrome") throw new Error("expected chrome");
    expect(chrome.activeTabId).toBe(right);
    await WindowStore.closeChromeTab(chrome.id, left);
    expect((WindowStore.getSnapshot().sessions[0] as typeof chrome).activeTabId).toBe(right);
    await WindowStore.closeChromeTab(chrome.id, right);
    expect(WindowStore.getSnapshot().sessions).toEqual([]);
  });

  it("Explorer tab마다 navigate·scroll·back·forward를 독립적으로 보존한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createFileExplorerWindow(null);
    const session = WindowStore.getSnapshot().sessions[0];
    if (session.kind !== "file-explorer") throw new Error("expected explorer");
    const firstTab = session.activeTabId;

    await WindowStore.navigateFileExplorer(session.id, firstTab, folderA);
    await WindowStore.setFileExplorerScrollTop(session.id, firstTab, 48);
    await WindowStore.navigateFileExplorer(session.id, firstTab, folderB);
    await WindowStore.setFileExplorerScrollTop(session.id, firstTab, 96);
    const noOpSnapshot = WindowStore.getSnapshot();
    expect(await WindowStore.navigateFileExplorer(session.id, firstTab, folderB)).toMatchObject({
      ok: true,
      changed: false,
    });
    expect(WindowStore.getSnapshot()).toBe(noOpSnapshot);
    await WindowStore.goBackFileExplorer(session.id, firstTab);
    let tab = (WindowStore.getSnapshot().sessions[0] as typeof session).tabs[0];
    expect(tab.navigation.current).toEqual({ location: folderA, scrollTop: 48 });
    await WindowStore.goForwardFileExplorer(session.id, firstTab);
    tab = (WindowStore.getSnapshot().sessions[0] as typeof session).tabs[0]!;
    expect(tab.navigation.current).toEqual({ location: folderB, scrollTop: 96 });

    await WindowStore.addFileExplorerTab(session.id);
    const next = WindowStore.getSnapshot().sessions[0];
    if (next.kind !== "file-explorer") throw new Error("expected explorer");
    expect(next.tabs[1]?.navigation.current).toEqual({ location: null, scrollTop: 0 });
    expect(next.tabs[0]?.navigation.current).toEqual({ location: folderB, scrollTop: 96 });
  });

  it("Chrome new-tab·Content·404에 같은 history를 적용하고 refresh는 revision만 바꾼다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    const session = WindowStore.getSnapshot().sessions[0];
    if (session.kind !== "chrome") throw new Error("expected chrome");
    const tabId = session.activeTabId;
    const notFound: ChromeLocation = {
      kind: "not-found",
      address: "/missing" as InternalAddress,
    };

    await WindowStore.navigateChrome(session.id, tabId, { kind: "content", ref: contentA });
    await WindowStore.setChromeScrollTop(session.id, tabId, 24);
    await WindowStore.navigateChrome(session.id, tabId, notFound);
    await WindowStore.goBackChrome(session.id, tabId);
    const beforeRefresh = (WindowStore.getSnapshot().sessions[0] as typeof session).tabs[0];
    await WindowStore.refreshChrome(session.id, tabId);
    const afterRefresh = (WindowStore.getSnapshot().sessions[0] as typeof session).tabs[0];
    expect(afterRefresh.navigation).toEqual(beforeRefresh.navigation);
    expect(afterRefresh.reloadRevision).toBe(1);
    await WindowStore.goForwardChrome(session.id, tabId);
    expect(
      (WindowStore.getSnapshot().sessions[0] as typeof session).tabs[0]?.navigation.current,
    ).toEqual({ location: notFound, scrollTop: 0 });
  });

  it("Folder 외부 open은 active-tab exact match의 MRU만 재사용하고 inactive match는 새 창을 만든다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createFileExplorerWindow(folderA);
    await WindowStore.createFileExplorerWindow(folderA);
    const [lower, upper] = sessionIds(WindowStore.getSnapshot());
    await WindowStore.minimize(upper);

    await WindowStore.openFolder(folderA);
    expect(WindowStore.getSnapshot().activeSessionId).toBe(upper);
    expect(WindowStore.getSnapshot().stackingOrder.at(-1)).toBe(upper);
    await WindowStore.addFileExplorerTab(upper);
    const count = WindowStore.getSnapshot().sessions.length;
    await WindowStore.openFolder(folderA);
    expect(WindowStore.getSnapshot().sessions).toHaveLength(count);
    expect(WindowStore.getSnapshot().activeSessionId).toBe(lower);
    await WindowStore.navigateFileExplorer(
      lower,
      (
        WindowStore.getSnapshot().sessions.find(({ id }) => id === lower) as never as {
          activeTabId: Parameters<typeof WindowStore.navigateFileExplorer>[1];
        }
      ).activeTabId,
      folderB,
    );
    await WindowStore.openFolder(folderA);
    expect(WindowStore.getSnapshot().sessions).toHaveLength(count + 1);
  });

  it("각 Folder 명령은 실행 시점의 최신 Workspace snapshot을 읽는다", async () => {
    const { WindowStore, initialization, setWorkspaceState, workspace } = await setup();
    await WindowStore.initialize(initialization);
    setWorkspaceState({
      ...initialWorkspace,
      folders: initialWorkspace.folders.filter(({ ref }) => ref.id !== folderB.id),
      placements: initialWorkspace.placements.filter(({ resource }) => resource.id !== folderB.id),
    });

    expect(await WindowStore.openFolder(folderB)).toMatchObject({
      ok: false,
      changed: false,
      reason: "folder-not-found",
    });
    expect(workspace.getSnapshot).toHaveBeenCalled();
    expect(WindowStore.getSnapshot().sessions).toEqual([]);
  });

  it("Content open은 active/MRU Chrome을 복원해 반복할 때마다 새 tab을 추가한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    const chromeId = WindowStore.getSnapshot().sessions[0].id;
    await WindowStore.createFileExplorerWindow(null);
    await WindowStore.minimize(chromeId);

    await WindowStore.openContent(contentA);
    await WindowStore.openContent(contentA);
    const chrome = WindowStore.getSnapshot().sessions.find(({ id }) => id === chromeId)!;
    if (chrome.kind !== "chrome") throw new Error("expected chrome");
    expect(chrome.tabs).toHaveLength(3);
    expect(chrome.tabs.slice(1).map((tab) => tab.navigation.current.location)).toEqual([
      { kind: "content", ref: contentA },
      { kind: "content", ref: contentA },
    ]);
    expect(chrome.frame.minimized).toBe(false);
    expect(WindowStore.getSnapshot().activeSessionId).toBe(chromeId);

    await WindowStore.openContentInNewWindow(contentB);
    expect(WindowStore.getSnapshot().sessions.filter(({ kind }) => kind === "chrome")).toHaveLength(
      2,
    );
  });

  it("maximize는 normalBounds를 보존하고 move·resize·workArea를 숫자로 처리한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    const id = WindowStore.getSnapshot().sessions[0].id;
    const original = WindowStore.getSnapshot().sessions[0].frame.normalBounds;

    await WindowStore.toggleMaximize(id);
    expect(WindowStore.getSnapshot().sessions[0]?.frame).toMatchObject({
      placement: "maximized",
      normalBounds: original,
    });
    await WindowStore.move(id, { x: 900, y: 700 });
    await WindowStore.resize(id, { width: 100, height: 100 });
    expect(WindowStore.getSnapshot().sessions[0]?.frame.normalBounds).toEqual({
      x: 390,
      y: 390,
      width: 320,
      height: 200,
    });
    await WindowStore.setWorkArea({ x: 0, y: 0, width: 400, height: 300 });
    expect(WindowStore.getSnapshot().sessions[0]?.frame).toMatchObject({
      placement: "maximized",
      normalBounds: { x: 280, y: 268, width: 320, height: 200 },
    });
    await WindowStore.toggleMaximize(id);
    expect(WindowStore.getSnapshot().sessions[0]?.frame.placement).toBe("normal");
  });

  it("잘못된 geometry·ref·Session·tab과 ID 충돌은 snapshot과 알림을 유지한다", async () => {
    const collision = uuid(1);
    const { WindowStore, initialization } = await setup([
      collision,
      collision,
      ...Array.from({ length: 10 }, (_, i) => uuid(i + 2)),
    ]);
    await WindowStore.initialize(initialization);
    const listener = vi.fn();
    WindowStore.subscribe(listener);
    const before = WindowStore.getSnapshot();

    expect(await WindowStore.createChromeWindow()).toMatchObject({
      ok: false,
      reason: "duplicate-runtime-id",
    });
    expect(WindowStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();

    const created = await WindowStore.createChromeWindow();
    expect(created.ok).toBe(true);
    const current = WindowStore.getSnapshot();
    const session = current.sessions[0];
    if (session.kind !== "chrome") throw new Error("expected chrome");
    listener.mockClear();
    const missingSession = "90000000-0000-4000-8000-000000000001" as typeof session.id;
    const missingTab = "90000000-0000-4000-8000-000000000002" as typeof session.activeTabId;
    const badFolder = { ...contentA, kind: "folder" } as unknown as FolderResourceRef;
    const results = await Promise.all([
      WindowStore.close(missingSession),
      WindowStore.closeChromeTab(session.id, missingTab),
      WindowStore.openFolder(badFolder),
      WindowStore.setChromeScrollTop(session.id, session.activeTabId, Number.NaN),
      WindowStore.setWorkArea({ x: 0, y: 0, width: -1, height: 20 }),
    ]);
    expect(results.every((result) => !result.ok)).toBe(true);
    expect(WindowStore.getSnapshot()).toBe(current);
    expect(listener).not.toHaveBeenCalled();
  });

  it("다른 앱 namespace의 tab ID와 UUID 발급기 부재를 변경 없이 거부한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    await WindowStore.createFileExplorerWindow(null);
    const [chrome, explorer] = WindowStore.getSnapshot().sessions;
    if (chrome?.kind !== "chrome" || explorer?.kind !== "file-explorer") {
      throw new Error("expected app sessions");
    }
    const before = WindowStore.getSnapshot();
    const listener = vi.fn();
    WindowStore.subscribe(listener);

    expect(
      await WindowStore.closeChromeTab(
        chrome.id,
        explorer.activeTabId as unknown as Parameters<typeof WindowStore.closeChromeTab>[1],
      ),
    ).toMatchObject({ ok: false, changed: false });
    vi.stubGlobal("crypto", {});
    expect(await WindowStore.addChromeTab(chrome.id)).toMatchObject({
      ok: false,
      reason: "runtime-id-unavailable",
    });
    expect(WindowStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("command 입력과 반환 snapshot의 중첩 객체를 외부에서 변조할 수 없다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    const mutable = { kind: "content", ref: { ...contentA } } as ChromeLocation;
    await WindowStore.createChromeWindow(mutable);
    const snapshot = WindowStore.getSnapshot();

    (mutable as { ref: { id: string } }).ref.id = contentB.id;
    const tab = snapshot.sessions[0]?.kind === "chrome" ? snapshot.sessions[0].tabs[0] : undefined;
    expect(tab?.navigation.current.location).toEqual({ kind: "content", ref: contentA });
    expect(Object.isFrozen(snapshot.sessions)).toBe(true);
    expect(Object.isFrozen(snapshot.sessions[0]?.frame.normalBounds)).toBe(true);
    expect(Object.isFrozen(tab?.navigation.current.location)).toBe(true);
    expect(() => (snapshot.sessions as unknown[]).push({})).toThrow();
  });

  it("초기 geometry dependency의 사후 변경이 새 Window 배치를 바꾸지 않는다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    initialization.placementConfig.defaultSize.width = 900;
    initialization.placementConfig.cascadeOffset.x = 400;
    initialization.workArea.width = 50;

    await WindowStore.createChromeWindow();
    expect(WindowStore.getSnapshot().workArea.width).toBe(1000);
    expect(WindowStore.getSnapshot().sessions[0]?.frame.normalBounds).toEqual({
      x: 200,
      y: 200,
      width: 600,
      height: 400,
    });
  });

  it("mobile 일반 tab 종료는 Chrome을 유지하고 마지막 Content 종료는 최신 parent로 복귀한다", async () => {
    const { WindowStore, initialization, setWorkspaceState, workspace } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.setMode("mobile");
    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    let chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");
    const contentTabId = chrome.activeTabId;
    await WindowStore.addChromeTab(chrome.id);
    chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");

    await WindowStore.closeChromeTab(chrome.id, chrome.activeTabId);
    expect(WindowStore.getSnapshot().sessions[0]).toMatchObject({
      kind: "chrome",
      activeTabId: contentTabId,
    });

    setWorkspaceState({
      ...initialWorkspace,
      placements: initialWorkspace.placements.map((placement) =>
        placement.resource.id === contentA.id ? { ...placement, parent: folderB } : placement,
      ),
    });
    await WindowStore.closeChromeTab(chrome.id, contentTabId);

    const explorer = WindowStore.getSnapshot().sessions[0];
    expect(explorer?.kind).toBe("file-explorer");
    if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
    expect(explorer.tabs[0]?.navigation.current.location).toEqual(folderB);
    expect(WindowStore.getSnapshot()).toMatchObject({
      mode: "mobile",
      activeSessionId: explorer.id,
    });
    expect(workspace.getSnapshot).toHaveBeenCalled();
  });

  it("mobile Chrome Window 종료는 active new-tab·404만 보고 다른 Content로 복귀하지 않는다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.setMode("mobile");

    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    let chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");
    await WindowStore.addChromeTab(chrome.id);
    chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");
    await WindowStore.close(chrome.id);
    expect(WindowStore.getSnapshot().sessions).toEqual([]);

    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");
    await WindowStore.addChromeTab(chrome.id);
    chrome = WindowStore.getSnapshot().sessions[0];
    if (chrome?.kind !== "chrome") throw new Error("expected chrome");
    await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, {
      kind: "not-found",
      address: "/missing" as InternalAddress,
    });
    await WindowStore.close(chrome.id);
    expect(WindowStore.getSnapshot().sessions).toEqual([]);
  });

  it("mobile Content의 Desktop parent와 누락 placement는 fresh Desktop Explorer로 복구한다", async () => {
    const { WindowStore, initialization, setWorkspaceState } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.setMode("mobile");

    setWorkspaceState({
      ...initialWorkspace,
      placements: initialWorkspace.placements.map((placement) =>
        placement.resource.id === contentA.id ? { ...placement, parent: null } : placement,
      ),
    });
    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    await WindowStore.close(WindowStore.getSnapshot().sessions[0].id);
    let explorer = WindowStore.getSnapshot().sessions[0];
    if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
    expect(explorer.tabs[0]?.navigation.current.location).toBeNull();

    setWorkspaceState({
      ...initialWorkspace,
      placements: initialWorkspace.placements.filter(
        (placement) => placement.resource.id !== contentA.id,
      ),
    });
    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    await WindowStore.close(WindowStore.getSnapshot().sessions[0].id);
    explorer = WindowStore.getSnapshot().sessions[0];
    if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
    expect(explorer.tabs[0]?.navigation.current.location).toBeNull();
  });

  it("mobile 앱 교체와 responsive 정리는 한 snapshot으로 cardinality를 지킨다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    await WindowStore.createFileExplorerWindow(folderA);
    await WindowStore.createChromeWindow({ kind: "content", ref: contentB });
    const activeBefore = WindowStore.getSnapshot().activeSessionId;
    const observed: Array<{ count: number; kinds: string[] }> = [];
    WindowStore.subscribe(() =>
      observed.push({
        count: WindowStore.getSnapshot().sessions.length,
        kinds: WindowStore.getSnapshot().sessions.map(({ kind }) => kind),
      }),
    );

    await WindowStore.setMode("mobile");
    expect(WindowStore.getSnapshot()).toMatchObject({
      mode: "mobile",
      activeSessionId: activeBefore,
      stackingOrder: [activeBefore],
    });
    await WindowStore.openFolder(folderB);
    expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
    expect(WindowStore.getSnapshot().sessions[0]?.kind).toBe("file-explorer");
    await WindowStore.openContent(contentA);
    expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
    expect(WindowStore.getSnapshot().sessions[0]?.kind).toBe("chrome");
    expect(observed.every(({ count }) => count <= 1)).toBe(true);
    expect(observed.some(({ kinds }) => kinds.length === 0)).toBe(false);
    const beforeNoOp = WindowStore.getSnapshot();
    expect(await WindowStore.setMode("mobile")).toMatchObject({ changed: false });
    expect(WindowStore.getSnapshot()).toBe(beforeNoOp);
    expect(await WindowStore.setMode("tablet" as "mobile")).toMatchObject({
      ok: false,
      changed: false,
      reason: "invalid-mode",
    });
    expect(WindowStore.getSnapshot()).toBe(beforeNoOp);
    await WindowStore.setMode("desktop");
    expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
  });

  it("desktop의 모든 minimized Session은 mobile 전환에서 제거되고 되살아나지 않는다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    await WindowStore.createFileExplorerWindow(folderA);
    for (const session of [...WindowStore.getSnapshot().sessions].reverse()) {
      await WindowStore.minimize(session.id);
    }

    await WindowStore.setMode("mobile");
    expect(WindowStore.getSnapshot()).toMatchObject({
      mode: "mobile",
      sessions: [],
      stackingOrder: [],
      activeSessionId: null,
    });
    await WindowStore.setMode("desktop");
    expect(WindowStore.getSnapshot().sessions).toEqual([]);
  });

  it("mobile의 move·resize·maximize는 normalBounds를 보존하는 no-op이다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.createChromeWindow();
    const session = WindowStore.getSnapshot().sessions[0];
    await WindowStore.setMode("mobile");
    const before = WindowStore.getSnapshot();

    expect(await WindowStore.move(session.id, { x: 500, y: 400 })).toMatchObject({
      changed: false,
    });
    expect(await WindowStore.resize(session.id, { width: 900, height: 700 })).toMatchObject({
      changed: false,
    });
    expect(await WindowStore.toggleMaximize(session.id)).toMatchObject({ changed: false });
    expect(WindowStore.getSnapshot()).toBe(before);
  });

  it("mobile replacement 후보 ID 발급 실패는 기존 Session을 보존한다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.setMode("mobile");
    await WindowStore.createFileExplorerWindow(folderA);
    const before = WindowStore.getSnapshot();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => before.sessions[0].id) });

    expect(await WindowStore.createChromeWindow()).toMatchObject({
      ok: false,
      changed: false,
      reason: "duplicate-runtime-id",
    });
    expect(WindowStore.getSnapshot()).toBe(before);
  });

  it("mobile Content 종료의 Explorer 후보 생성 실패는 현재 Chrome을 먼저 제거하지 않는다", async () => {
    const { WindowStore, initialization } = await setup();
    await WindowStore.initialize(initialization);
    await WindowStore.setMode("mobile");
    await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
    const before = WindowStore.getSnapshot();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => before.sessions[0].id) });

    expect(await WindowStore.close(before.sessions[0].id)).toMatchObject({
      ok: false,
      changed: false,
      reason: "duplicate-runtime-id",
    });
    expect(WindowStore.getSnapshot()).toBe(before);
  });
});
