import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResourceRef,
  type ExternalShortcut,
  type ExternalShortcutCatalogReader,
  type ResourceRef,
} from "../../resources/index.js";
import type { StartStorage } from "../../start/index.js";
import type { WindowSession, WindowSessionId, WindowState } from "../../windows/index.js";
import type { TaskbarItem } from "../model/index.js";
import type { TaskbarStorage, TaskbarStorageSnapshot } from "./taskbarStorage/index.js";

const shortcutRef = createResourceRef("external-shortcut", "40000000-0000-4000-8000-000000000001");
const missingShortcutRef = createResourceRef(
  "external-shortcut",
  "40000000-0000-4000-8000-000000000002",
);
const folderRef = createResourceRef("folder", "40000000-0000-4000-8000-000000000003");
const contentRef = createResourceRef("content", "40000000-0000-4000-8000-000000000004");
const explorer: TaskbarItem = { kind: "application", applicationId: "file-explorer" };
const chrome: TaskbarItem = { kind: "application", applicationId: "chrome" };
const shortcut: TaskbarItem = { kind: "external-shortcut", resource: shortcutRef };

/** schema version 1의 Taskbar 저장 fixture를 만든다. */
const saved = (items: readonly TaskbarItem[]): TaskbarStorageSnapshot => ({
  schemaVersion: 1,
  items,
});

/** 테스트가 load 값, save 실패와 완료 시점을 제어하는 Taskbar storage fake를 만든다. */
const storage = (initial: unknown) => {
  let current = initial;
  return {
    load: vi.fn<TaskbarStorage["load"]>(() => Promise.resolve(current)),
    save: vi.fn<TaskbarStorage["save"]>((snapshot) => {
      current = snapshot;
      return Promise.resolve();
    }),
    /** 다음 reload가 읽을 외부 값을 교체한다. */
    replace(next: unknown) {
      current = next;
    },
  };
};

/** 현재 존재 shortcut 집합을 바꿀 수 있는 Catalog reader fake를 만든다. */
const shortcutCatalog = () => {
  const entries = new Map<string, ExternalShortcut>([
    [shortcutRef.id, { ref: shortcutRef, name: "Docs", url: "https://example.com/docs" }],
  ]);
  const catalog: ExternalShortcutCatalogReader = {
    /** 현재 map에 ID가 존재하는지 확인한다. */
    has(id) {
      return entries.has(id);
    },
    /** 현재 map의 shortcut 원본을 반환한다. */
    get(id) {
      return entries.get(id);
    },
    /** 현재 map의 shortcut 원본 목록을 반환한다. */
    list() {
      return [...entries.values()];
    },
  };
  return { catalog, entries };
};

/** 앱과 ID를 가진 최소 WindowSession fixture를 만든다. */
const session = (applicationId: "file-explorer" | "chrome", id: string): WindowSession => {
  const frame = {
    normalBounds: { x: 0, y: 0, width: 600, height: 400 },
    placement: "normal" as const,
    minimized: false,
  };
  return applicationId === "file-explorer"
    ? ({
        id: id as WindowSessionId,
        kind: "file-explorer",
        applicationId,
        frame,
        tabs: [
          {
            id: `${id.slice(0, -1)}a` as never,
            navigation: {
              current: { location: null, scrollTop: 0 },
              backStack: [],
              forwardStack: [],
            },
          },
        ],
        activeTabId: `${id.slice(0, -1)}a` as never,
      } satisfies WindowSession)
    : ({
        id: id as WindowSessionId,
        kind: "chrome",
        applicationId,
        frame,
        tabs: [
          {
            id: `${id.slice(0, -1)}b` as never,
            navigation: {
              current: { location: { kind: "new-tab" }, scrollTop: 0 },
              backStack: [],
              forwardStack: [],
            },
            reloadRevision: 0,
          },
        ],
        activeTabId: `${id.slice(0, -1)}b` as never,
      } satisfies WindowSession);
};

/** Session 목록으로 일관된 desktop WindowState fixture를 만든다. */
const windowState = (sessions: readonly WindowSession[]): WindowState => ({
  mode: "desktop",
  workArea: { x: 0, y: 0, width: 1000, height: 800 },
  sessions,
  stackingOrder: sessions.map(({ id }) => id),
  activeSessionId: sessions.at(-1)?.id ?? null,
});

/** 알림 시점의 snapshot을 교체할 수 있는 Window reader fake를 만든다. */
const windowReader = (initial: WindowState) => {
  let current = initial;
  const listeners = new Set<() => void>();
  const reader = {
    /** 현재 Window fixture를 반환한다. */
    getSnapshot: vi.fn(() => current),
    /** listener를 등록하고 해제 함수를 반환한다. */
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    /** 새 Window commit을 설정하고 현재 listener를 동기 호출한다. */
    commit(next: WindowState) {
      current = next;
      for (const listener of [...listeners]) listener();
    },
  };
  return reader;
};

/** 완료와 실패 시점을 테스트가 제어할 Promise gate를 만든다. */
const deferred = <Value>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

/** 매 테스트에서 singleton state가 격리된 Taskbar public module을 읽는다. */
const loadStore = () => import("./index.js");

/** 기본 fake dependency로 Store를 초기화하고 관찰 기록을 비운다. */
const initialize = async (
  initial: unknown = null,
  initialWindow: WindowState = windowState([]),
  clearStorageMocks = true,
) => {
  const storeModule = await loadStore();
  const fakeStorage = storage(initial);
  const shortcuts = shortcutCatalog();
  const windows = windowReader(initialWindow);
  await storeModule.TaskbarStore.initialize({
    storage: fakeStorage,
    externalShortcutCatalog: shortcuts.catalog,
    windowReader: windows,
  });
  if (clearStorageMocks) {
    fakeStorage.load.mockClear();
    fakeStorage.save.mockClear();
  }
  return { ...storeModule, fakeStorage, shortcuts, windows };
};

/** snapshot item을 비교하기 쉬운 stable identity 문자열로 투영한다. */
const keys = (items: readonly TaskbarItem[]): readonly string[] =>
  items.map((item) =>
    item.kind === "application" ? item.applicationId : `shortcut:${item.resource.id}`,
  );

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("TaskbarStore", () => {
  it("저장값 없음은 Explorer→Chrome seed를 저장하고 정상 빈 배열은 그대로 복원한다", async () => {
    const seeded = await initialize(null, windowState([]), false);
    expect(keys(seeded.TaskbarStore.getSnapshot().pinnedItems)).toEqual([
      "file-explorer",
      "chrome",
    ]);
    expect(seeded.fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([explorer, chrome]));

    vi.resetModules();
    const empty = await initialize(saved([]), windowState([]), false);
    expect(empty.TaskbarStore.getSnapshot()).toEqual({ pinnedItems: [], visibleItems: [] });
    expect(empty.fakeStorage.save).not.toHaveBeenCalled();
    expect(Object.isFrozen(empty.TaskbarStore.getSnapshot())).toBe(true);
  });

  it("지원하지 않는 schema와 전체 손상은 Taskbar만 seed로 복구한다", async () => {
    const { TaskbarStore, fakeStorage } = await initialize(
      { schemaVersion: 2, items: [shortcut] },
      windowState([]),
      false,
    );
    expect(keys(TaskbarStore.getSnapshot().pinnedItems)).toEqual(["file-explorer", "chrome"]);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([explorer, chrome]));
  });

  it("초기화 중 명령은 load 뒤 최신 복원 snapshot에서 실행한다", async () => {
    const storeModule = await loadStore();
    const loadGate = deferred<unknown>();
    const fakeStorage = storage(null);
    fakeStorage.load.mockReturnValueOnce(loadGate.promise);
    const shortcuts = shortcutCatalog();
    const windows = windowReader(windowState([]));
    const initializing = storeModule.TaskbarStore.initialize({
      storage: fakeStorage,
      externalShortcutCatalog: shortcuts.catalog,
      windowReader: windows,
    });
    const pinning = storeModule.TaskbarStore.pin(shortcut);
    loadGate.resolve(saved([chrome]));
    await initializing;
    await pinning;
    expect(keys(storeModule.TaskbarStore.getSnapshot().pinnedItems)).toEqual([
      "chrome",
      `shortcut:${shortcutRef.id}`,
    ]);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([chrome, shortcut]));
  });

  it("부분 손상·missing·중복만 제거하고 Content와 Folder 직접 Pin을 거절한다", async () => {
    const { TaskbarStore, fakeStorage } = await initialize(
      {
        schemaVersion: 1,
        items: [
          chrome,
          { kind: "external-shortcut", resource: missingShortcutRef },
          shortcut,
          chrome,
          { kind: "external-shortcut", resource: folderRef },
          { kind: "application", applicationId: "mail" },
        ],
      },
      windowState([]),
      false,
    );
    expect(keys(TaskbarStore.getSnapshot().pinnedItems)).toEqual([
      "chrome",
      `shortcut:${shortcutRef.id}`,
    ]);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([chrome, shortcut]));
    await expect(TaskbarStore.pin(folderRef)).resolves.toEqual({
      ok: false,
      reason: "invalid-taskbar-item",
    });
    await expect(TaskbarStore.pin(contentRef)).resolves.toEqual({
      ok: false,
      reason: "invalid-taskbar-item",
    });
    expect(TaskbarStore.getPinLabel(folderRef)).toBeNull();
    expect(TaskbarStore.getPinLabel(contentRef)).toBeNull();
  });

  it("mixed visible reorder는 Pin 여부를 유지하고 pinned projection만 저장한다", async () => {
    const explorerWindow = session("file-explorer", "50000000-0000-4000-8000-000000000001");
    const { TaskbarStore, fakeStorage } = await initialize(
      saved([chrome, shortcut]),
      windowState([explorerWindow]),
    );
    expect(keys(TaskbarStore.getSnapshot().visibleItems)).toEqual([
      "chrome",
      `shortcut:${shortcutRef.id}`,
      "file-explorer",
    ]);

    await TaskbarStore.reorder(explorer, { type: "index", index: 0 });
    expect(fakeStorage.save).not.toHaveBeenCalled();
    await TaskbarStore.reorder(shortcut, "first");
    expect(keys(TaskbarStore.getSnapshot().visibleItems)).toEqual([
      `shortcut:${shortcutRef.id}`,
      "file-explorer",
      "chrome",
    ]);
    expect(keys(TaskbarStore.getSnapshot().pinnedItems)).toEqual([
      `shortcut:${shortcutRef.id}`,
      "chrome",
    ]);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([shortcut, chrome]));
  });

  it("reload는 최신 persistent 순서를 복원하고 running-only application을 끝에 추가한다", async () => {
    const explorerWindow = session("file-explorer", "50000000-0000-4000-8000-000000000005");
    const { TaskbarStore, fakeStorage } = await initialize(
      saved([shortcut, chrome]),
      windowState([explorerWindow]),
    );
    fakeStorage.replace(saved([chrome, shortcut]));
    await TaskbarStore.reload();
    expect(keys(TaskbarStore.getSnapshot().pinnedItems)).toEqual([
      "chrome",
      `shortcut:${shortcutRef.id}`,
    ]);
    expect(keys(TaskbarStore.getSnapshot().visibleItems)).toEqual([
      "chrome",
      `shortcut:${shortcutRef.id}`,
      "file-explorer",
    ]);
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("visible application Pin·Unpin은 위치를 유지하고 마지막 close 뒤 재실행은 끝에 추가한다", async () => {
    const explorerWindow = session("file-explorer", "50000000-0000-4000-8000-000000000011");
    const chromeWindow = session("chrome", "50000000-0000-4000-8000-000000000012");
    const { TaskbarStore, windows } = await initialize(
      saved([shortcut]),
      windowState([explorerWindow, chromeWindow]),
    );
    await TaskbarStore.reorder(chrome, "first");
    await TaskbarStore.pin(chrome);
    await TaskbarStore.unpin(chrome);
    expect(keys(TaskbarStore.getSnapshot().visibleItems)[0]).toBe("chrome");

    windows.commit(windowState([explorerWindow]));
    windows.commit(windowState([explorerWindow, chromeWindow]));
    await TaskbarStore.reconcileWindows();
    expect(keys(TaskbarStore.getSnapshot().visibleItems)).toEqual([
      `shortcut:${shortcutRef.id}`,
      "file-explorer",
      "chrome",
    ]);
  });

  it("느린 save 중 각 Window close→reopen snapshot을 보존해 running-only 위치를 복구하지 않는다", async () => {
    const explorerWindow = session("file-explorer", "50000000-0000-4000-8000-000000000021");
    const chromeWindow = session("chrome", "50000000-0000-4000-8000-000000000022");
    const { TaskbarStore, fakeStorage, windows } = await initialize(
      saved([]),
      windowState([explorerWindow, chromeWindow]),
    );
    const saveGate = deferred<void>();
    fakeStorage.save.mockReturnValueOnce(saveGate.promise);
    const pinning = TaskbarStore.pin(shortcut);
    await vi.waitFor(() => expect(fakeStorage.save).toHaveBeenCalledOnce());

    windows.commit(windowState([explorerWindow]));
    windows.commit(windowState([explorerWindow, chromeWindow]));
    saveGate.resolve();
    await pinning;
    await TaskbarStore.reconcileWindows();

    expect(keys(TaskbarStore.getSnapshot().visibleItems)).toEqual([
      "file-explorer",
      `shortcut:${shortcutRef.id}`,
      "chrome",
    ]);
  });

  it("activation·minimize·tab 계열 Window commit은 Group visible 위치를 바꾸지 않는다", async () => {
    const explorerWindow = session("file-explorer", "50000000-0000-4000-8000-000000000025");
    const chromeWindow = session("chrome", "50000000-0000-4000-8000-000000000026");
    const { TaskbarStore, windows } = await initialize(
      saved([]),
      windowState([explorerWindow, chromeWindow]),
    );
    const before = TaskbarStore.getSnapshot();
    windows.commit({
      ...windowState([explorerWindow, chromeWindow]),
      stackingOrder: [chromeWindow.id, explorerWindow.id],
      activeSessionId: chromeWindow.id,
      sessions: [
        {
          ...explorerWindow,
          frame: { ...explorerWindow.frame, minimized: true },
        },
        chromeWindow,
      ],
    });
    await TaskbarStore.reconcileWindows();
    expect(TaskbarStore.getSnapshot()).toBe(before);
  });

  it("subscriber 재진입 명령은 현재 commit과 save 뒤 최신 snapshot에서 실행한다", async () => {
    const { TaskbarStore, fakeStorage } = await initialize(saved([]));
    const saveGate = deferred<void>();
    fakeStorage.save.mockReturnValueOnce(saveGate.promise);
    let reentered: Promise<unknown> | undefined;
    TaskbarStore.subscribe(() => {
      if (TaskbarStore.isPinned(shortcut) && reentered === undefined) {
        reentered = TaskbarStore.pin(chrome);
      }
    });
    const first = TaskbarStore.pin(shortcut);
    await vi.waitFor(() => expect(fakeStorage.save).toHaveBeenCalledOnce());
    expect(fakeStorage.save.mock.calls[0]?.[0]).toEqual(saved([shortcut]));
    saveGate.resolve();
    await first;
    await reentered;
    expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.items)).toEqual([
      [shortcut],
      [shortcut, chrome],
    ]);
  });

  it("save 실패는 메모리를 유지하고 다음 변경이 최신 전체 Pin을 저장한다", async () => {
    const { TaskbarStore, fakeStorage } = await initialize(saved([]));
    fakeStorage.save.mockRejectedValueOnce(new Error("write failed"));
    await expect(TaskbarStore.pin(shortcut)).resolves.toMatchObject({
      ok: false,
      reason: "storage-write-failed",
      committed: true,
    });
    expect(TaskbarStore.isPinned(shortcut)).toBe(true);
    await TaskbarStore.pin(chrome);
    expect(fakeStorage.save.mock.calls[1]?.[0]).toEqual(saved([shortcut, chrome]));
  });

  it("missing shortcut reconcile은 Start와 Window 상태를 변경하지 않는다", async () => {
    const chromeWindow = session("chrome", "50000000-0000-4000-8000-000000000031");
    const { TaskbarStore, shortcuts, windows } = await initialize(
      saved([shortcut, chrome]),
      windowState([chromeWindow]),
    );
    const beforeWindow = windows.getSnapshot();
    shortcuts.entries.delete(shortcutRef.id);
    await TaskbarStore.reconcileResources();
    expect(keys(TaskbarStore.getSnapshot().pinnedItems)).toEqual(["chrome"]);
    expect(windows.getSnapshot()).toBe(beforeWindow);
  });

  it("같은 dependency 초기화는 같은 결과를 반환하고 다른 재결합은 거부한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage = storage(saved([]));
    const shortcuts = shortcutCatalog();
    const windows = windowReader(windowState([]));
    const initialization = {
      storage: fakeStorage,
      externalShortcutCatalog: shortcuts.catalog,
      windowReader: windows,
    };
    const first = await storeModule.TaskbarStore.initialize(initialization);
    const second = await storeModule.TaskbarStore.initialize(initialization);
    expect(second).toBe(first);
    expect(fakeStorage.load).toHaveBeenCalledOnce();
    expect(windows.subscribe).toHaveBeenCalledOnce();
    await expect(
      storeModule.TaskbarStore.initialize({ ...initialization, storage: storage(saved([])) }),
    ).rejects.toBeInstanceOf(storeModule.TaskbarStoreAlreadyInitializedError);
  });

  it("실제 WindowStore bootstrap과 close→reopen commit을 연결해 running-only 위치를 끝으로 옮긴다", async () => {
    vi.resetModules();
    const generated = Array.from(
      { length: 20 },
      (_, index) => `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => generated.shift()) });
    const api = await import("../../index.js");
    const workspace = {
      /** 빈 Resource 배치를 가진 Workspace snapshot을 반환한다. */
      getSnapshot: () => ({
        schemaVersion: 1 as const,
        contentInbox: folderRef,
        folders: [{ ref: folderRef, name: "Desktop" }],
        placements: [{ resource: folderRef, parent: null }],
      }),
    };
    const emptyContentCatalog = {
      /** 빈 Catalog에는 Content ID가 없다. */
      has: () => false,
      /** 빈 Catalog에서 Content 조회는 undefined다. */
      get: () => undefined,
      /** 빈 Content 목록을 반환한다. */
      list: () => [],
    };
    await api.WindowStore.initialize({
      workspace,
      contentCatalog: emptyContentCatalog,
      placementConfig: {
        defaultSize: { width: 600, height: 400 },
        minSize: { width: 320, height: 200 },
        edgeMargin: 10,
        cascadeOffset: { x: 30, y: 20 },
        titlebarRecoverySize: { width: 120, height: 32 },
      },
      workArea: { x: 0, y: 0, width: 1000, height: 800 },
    });
    await api.WindowStore.createChromeWindow();
    const oldChromeId = api.WindowStore.getSnapshot().sessions[0]?.id;
    expect(oldChromeId).toBeDefined();
    const fakeStorage = storage(saved([]));
    const shortcuts = shortcutCatalog();
    await api.TaskbarStore.initialize({
      storage: fakeStorage,
      externalShortcutCatalog: shortcuts.catalog,
      windowReader: api.WindowStore,
    });
    expect(keys(api.TaskbarStore.getSnapshot().visibleItems)).toEqual(["chrome"]);

    await api.WindowStore.createFileExplorerWindow(null);
    await api.TaskbarStore.reconcileWindows();
    expect(keys(api.TaskbarStore.getSnapshot().visibleItems)).toEqual(["chrome", "file-explorer"]);
    await api.WindowStore.close(oldChromeId);
    await api.WindowStore.createChromeWindow();
    await api.TaskbarStore.reconcileWindows();
    expect(keys(api.TaskbarStore.getSnapshot().visibleItems)).toEqual(["file-explorer", "chrome"]);
  });

  it("StartStore와 TaskbarStore의 Pin, Unpin과 storage가 양방향으로 독립이다", async () => {
    vi.resetModules();
    const api = await import("../../index.js");
    const startStorage = {
      load: vi.fn<StartStorage["load"]>(() =>
        Promise.resolve({
          schemaVersion: 1,
          resources: [folderRef],
        }),
      ),
      save: vi.fn<StartStorage["save"]>(() => Promise.resolve()),
    };
    const taskbarStorage = storage(saved([shortcut]));
    const shortcuts = shortcutCatalog();
    const windows = windowReader(windowState([]));
    const resourceLookup = {
      /** Start fixture의 Folder와 shortcut 존재 여부를 확인한다. */
      hasResource: (resource: ResourceRef) =>
        (resource.kind === "folder" && resource.id === folderRef.id) ||
        (resource.kind === "external-shortcut" && resource.id === shortcutRef.id),
    };
    await api.StartStore.initialize({ storage: startStorage, resourceLookup });
    await api.TaskbarStore.initialize({
      storage: taskbarStorage,
      externalShortcutCatalog: shortcuts.catalog,
      windowReader: windows,
    });
    startStorage.save.mockClear();
    taskbarStorage.save.mockClear();

    await api.TaskbarStore.unpin(shortcut);
    expect(api.StartStore.isPinned(folderRef)).toBe(true);
    expect(startStorage.save).not.toHaveBeenCalled();
    const taskbarAfterUnpin = api.TaskbarStore.getSnapshot();
    const taskbarSaveCount = taskbarStorage.save.mock.calls.length;
    await api.StartStore.unpin(folderRef);
    expect(api.TaskbarStore.getSnapshot()).toBe(taskbarAfterUnpin);
    expect(taskbarStorage.save).toHaveBeenCalledTimes(taskbarSaveCount);
  });
});
