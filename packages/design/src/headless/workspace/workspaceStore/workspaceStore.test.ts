import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Content,
  type ContentResourceRef,
  createResourceLookup,
  createResourceRef,
  createStaticCatalog,
  type ResourceRef,
} from "../../resources/index.js";
import type { WorkspaceState } from "../model/index.js";
import type { WorkspaceStorage } from "./workspaceStorage/index.js";

const ref = <Kind extends ResourceRef["kind"]>(kind: Kind, suffix: string) =>
  createResourceRef(kind, `00000000-0000-4000-8000-${suffix}`);

const inbox = ref("folder", "000000000001");
const firstContent = ref("content", "000000000002");
const secondContent = ref("content", "000000000003");

const seed = (): WorkspaceState => ({
  schemaVersion: 1,
  contentInbox: inbox,
  folders: [{ ref: inbox, name: "Blog" }],
  placements: [
    { resource: inbox, parent: null },
    { resource: firstContent, parent: inbox },
  ],
});

const catalogFor = (refs: readonly ContentResourceRef[], events: string[] = []) => {
  const catalog = createStaticCatalog<Content>(
    refs.map((ref) => ({
      ref,
      title: "글",
      slug: ref.id,
      summary: "",
      date: "2026-09-06",
      tags: [],
      cover: null,
      source: { kind: "notion", pageId: ref.id },
    })),
  );
  return {
    get: catalog.get,
    list: catalog.list,
    has(id: ContentResourceRef["id"]) {
      events.push("lookup:content");
      return catalog.has(id);
    },
  };
};

const mockUuid = (generated = ref("folder", "000000000099").id) =>
  vi
    .spyOn(globalThis.crypto, "randomUUID")
    .mockReturnValue(generated as `${string}-${string}-${string}-${string}-${string}`);

const storage = (saved: unknown, events: string[] = []) => ({
  load: vi.fn<WorkspaceStorage["load"]>(() => {
    events.push("load");
    return Promise.resolve(saved);
  }),
  save: vi.fn<WorkspaceStorage["save"]>(() => {
    events.push("save");
    return Promise.resolve();
  }),
});

const loadStore = () => import("./index.js");

const deferred = <Value>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("WorkspaceStore", () => {
  it("정적 Catalog로 초기화한 뒤 실제 FolderCatalog와 전역 lookup을 연결한다", async () => {
    const { WorkspaceStore } = await loadStore();
    const { FolderCatalog } = await import("../folderCatalog/index.js");
    const contentCatalog = catalogFor([firstContent, secondContent]);
    const shortcut = ref("external-shortcut", "000000000030");
    const externalShortcutCatalog = createStaticCatalog([
      { ref: shortcut, name: "문서", url: "https://example.com" },
    ]);
    const saved = seed();
    const fakeStorage = storage({
      ...saved,
      placements: [...saved.placements, { resource: shortcut, parent: inbox }],
    });
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog,
      externalShortcutCatalog,
    });
    const lookup = createResourceLookup({
      content: contentCatalog,
      folder: FolderCatalog,
      externalShortcut: externalShortcutCatalog,
    });
    expect(lookup.hasResource(inbox)).toBe(true);
    expect(lookup.hasResource(secondContent)).toBe(true);
    expect(lookup.hasResource(shortcut)).toBe(true);
    expect(WorkspaceStore.getSnapshot().placements).toContainEqual({
      resource: shortcut,
      parent: inbox,
    });
    expect(WorkspaceStore.getSnapshot().placements).toContainEqual({
      resource: secondContent,
      parent: inbox,
    });
    const created = ref("folder", "000000000031");
    mockUuid(created.id);
    await WorkspaceStore.createFolder("새 폴더", null);
    expect(lookup.hasResource(created)).toBe(true);
  });

  it("후보 Folder와 정적 원본의 ID 충돌은 commit 전에 초기화를 거부한다", async () => {
    const { WorkspaceStore, WorkspaceStoreNotInitializedError } = await loadStore();
    const fakeStorage = storage(null);
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    const initialization = WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([createResourceRef("content", inbox.id)]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    const queued = WorkspaceStore.renameFolder(inbox, "변경");
    await expect(initialization).rejects.toThrow("전역 Resource namespace");
    await expect(queued).rejects.toBeInstanceOf(WorkspaceStoreNotInitializedError);
    expect(() => WorkspaceStore.getSnapshot()).toThrow(WorkspaceStoreNotInitializedError);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("초기화 load 중 요청한 명령도 첫 snapshot 생성과 저장 이후 실행한다", async () => {
    const { WorkspaceStore } = await loadStore();
    const gate = deferred<unknown>();
    const fakeStorage = storage(null);
    fakeStorage.load.mockReturnValueOnce(gate.promise);
    const initialization = WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    const rename = WorkspaceStore.renameFolder(inbox, "대기한 변경");
    await Promise.resolve();
    expect(fakeStorage.save).not.toHaveBeenCalled();
    gate.resolve(null);
    await initialization;
    await rename;
    expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.folders[0].name)).toEqual([
      "Blog",
      "대기한 변경",
    ]);
  });

  it.each([false, true])(
    "첫 알림에서 요청한 명령은 첫 저장 완료 뒤 실행한다 (저장 실패: %s)",
    async (fail) => {
      const { WorkspaceStore } = await loadStore();
      const gate = deferred<void>();
      const started = deferred<void>();
      const events: string[] = [];
      const fakeStorage = storage(null);
      fakeStorage.save
        .mockImplementationOnce(async () => {
          events.push("initial-save-start");
          started.resolve();
          try {
            await gate.promise;
          } finally {
            events.push("initial-save-end");
          }
        })
        .mockImplementation(() => {
          events.push("command-save");
          return Promise.resolve();
        });
      let queued: ReturnType<typeof WorkspaceStore.renameFolder> | undefined;
      const unsubscribe = WorkspaceStore.subscribe(() => {
        unsubscribe();
        queued = WorkspaceStore.renameFolder(inbox, "Writing");
      });
      const initialization = WorkspaceStore.initialize({
        storage: fakeStorage,
        seed: seed(),
        contentCatalog: catalogFor([firstContent]),
        externalShortcutCatalog: createStaticCatalog([]),
      });
      await started.promise;
      await Promise.resolve();
      expect(fakeStorage.save).toHaveBeenCalledOnce();
      expect(WorkspaceStore.getSnapshot().folders[0]?.name).toBe("Blog");
      if (fail) gate.reject(new Error("저장 실패"));
      else gate.resolve();
      const result = await initialization;
      expect(result.ok).toBe(!fail);
      if (fail) expect(result).toMatchObject({ reason: "storage-write-failed", committed: true });
      expect((await queued)?.ok).toBe(true);
      expect(events).toEqual(["initial-save-start", "initial-save-end", "command-save"]);
      expect(WorkspaceStore.getSnapshot().folders[0]?.name).toBe("Writing");
    },
  );

  it("배치되지 않은 정적 Shortcut ID는 생성과 inbox 복구에서도 재사용하지 않는다", async () => {
    const shortcut = ref("external-shortcut", "000000000032");
    const externalShortcutCatalog = createStaticCatalog([
      { ref: shortcut, name: "문서", url: "https://example.com" },
    ]);
    mockUuid(shortcut.id);
    const { WorkspaceStore } = await loadStore();
    const fakeStorage = storage(null);
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog,
    });
    fakeStorage.save.mockClear();
    await expect(WorkspaceStore.createFolder("충돌", null)).resolves.toEqual({
      ok: false,
      reason: "duplicate-resource-id",
    });
    expect(fakeStorage.save).not.toHaveBeenCalled();

    vi.resetModules();
    const fresh = await loadStore();
    const recoveryStorage = storage({ ...seed(), folders: [], placements: [] });
    await expect(
      fresh.WorkspaceStore.initialize({
        storage: recoveryStorage,
        seed: seed(),
        contentCatalog: catalogFor([]),
        externalShortcutCatalog,
      }),
    ).rejects.toThrow("전역 Resource namespace");
    expect(recoveryStorage.save).not.toHaveBeenCalled();
  });
  it("저장값이 없으면 seed를 reconcile한 뒤 첫 snapshot을 알리고 저장한다", async () => {
    const events: string[] = [];
    const storeModule = await loadStore();
    const fakeStorage = storage(null, events);
    const currentContent = [firstContent, secondContent] as const;
    const unsubscribe = storeModule.WorkspaceStore.subscribe(() => {
      events.push("notify");
      expect(storeModule.WorkspaceStore.getSnapshot().placements).toContainEqual({
        resource: secondContent,
        parent: inbox,
      });
    });

    const result = await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor(currentContent, events),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(result.ok).toBe(true);
    expect(events[0]).toBe("load");
    expect(events.indexOf("notify")).toBeGreaterThan(events.lastIndexOf("lookup:content"));
    expect(events.at(-1)).toBe("save");
    expect(fakeStorage.save).toHaveBeenCalledOnce();
    expect(fakeStorage.save).toHaveBeenCalledWith(storeModule.WorkspaceStore.getSnapshot());
    unsubscribe();
  });

  it("유효한 저장 snapshot을 authoritative하게 보존하고 stale placement만 수리한다", async () => {
    const personal = ref("folder", "000000000004");
    const stale = ref("external-shortcut", "000000000005");
    const saved: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: inbox,
      folders: [
        { ref: inbox, name: "Writing" },
        { ref: personal, name: "Personal" },
      ],
      placements: [
        { resource: inbox, parent: null },
        { resource: personal, parent: inbox },
        { resource: firstContent, parent: null },
        { resource: stale, parent: personal },
      ],
    };
    const storeModule = await loadStore();
    const fakeStorage = storage(saved);

    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(storeModule.WorkspaceStore.getSnapshot()).toMatchObject({
      contentInbox: inbox,
      folders: [
        { ref: inbox, name: "Writing" },
        { ref: personal, name: "Personal" },
      ],
      placements: [
        { resource: inbox, parent: null },
        { resource: personal, parent: inbox },
        { resource: firstContent, parent: null },
      ],
    });
  });

  it.each([
    { schemaVersion: 2 },
    { schemaVersion: 1, contentInbox: inbox, folders: "invalid", placements: [] },
  ])("읽을 수 없거나 schema가 다른 저장값은 seed로 복구한다", async (saved) => {
    const storeModule = await loadStore();
    const fakeStorage = storage(saved);

    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(storeModule.WorkspaceStore.getSnapshot()).toEqual(seed());
    expect(fakeStorage.save).toHaveBeenCalledOnce();
  });

  it("storage load 실패도 seed로 복구해 유효한 snapshot을 저장한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage: WorkspaceStorage = {
      load: vi.fn(() => Promise.reject(new Error("unreadable"))),
      save: vi.fn(() => Promise.resolve()),
    };

    const result = await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(result.ok).toBe(true);
    expect(storeModule.WorkspaceStore.getSnapshot()).toEqual(seed());
    expect(fakeStorage.save).toHaveBeenCalledOnce();
  });

  it("missing inbox는 IdGenerator를 한 번 사용해 Folder와 ref를 원자적으로 commit한다", async () => {
    const missingInbox = ref("folder", "000000000010");
    const recoveredInbox = ref("folder", "000000000011");
    const saved: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: missingInbox,
      folders: [],
      placements: [],
    };
    const generator = mockUuid(recoveredInbox.id);
    const storeModule = await loadStore();
    const fakeStorage = storage(saved);

    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(generator).toHaveBeenCalledOnce();
    expect(storeModule.WorkspaceStore.getSnapshot()).toMatchObject({
      contentInbox: recoveredInbox,
      folders: [{ ref: recoveredInbox, name: "Blog" }],
      placements: [
        { resource: recoveredInbox, parent: null },
        { resource: firstContent, parent: recoveredInbox },
      ],
    });
    expect(fakeStorage.save).toHaveBeenCalledWith(storeModule.WorkspaceStore.getSnapshot());
  });

  it("성공 command는 commit, notify, persist를 한 번씩 순서대로 수행한다", async () => {
    const events: string[] = [];
    const created = ref("folder", "000000000012");
    const storeModule = await loadStore();
    const fakeStorage = storage(null, events);
    const generator = mockUuid(created.id);
    const initialization = {
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    };
    await storeModule.WorkspaceStore.initialize(initialization);
    fakeStorage.save.mockClear();
    events.length = 0;
    const unsubscribe = storeModule.WorkspaceStore.subscribe(() => {
      events.push(`notify:${storeModule.WorkspaceStore.getSnapshot().folders.at(-1)?.name}`);
    });

    const result = await storeModule.WorkspaceStore.createFolder("Projects", null);

    expect(result).toEqual({ ok: true, value: storeModule.WorkspaceStore.getSnapshot() });
    expect(events).toEqual(["notify:Projects", "save"]);
    expect(fakeStorage.save).toHaveBeenCalledOnce();
    expect(generator).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("거부와 no-op command는 snapshot, 알림, 저장을 바꾸지 않는다", async () => {
    const missing = ref("folder", "000000000013");
    const storeModule = await loadStore();
    const fakeStorage = storage(null);
    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    fakeStorage.save.mockClear();
    const before = storeModule.WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    const unsubscribe = storeModule.WorkspaceStore.subscribe(listener);

    await expect(storeModule.WorkspaceStore.renameFolder(inbox, "Blog")).resolves.toEqual({
      ok: false,
      reason: "no-op",
    });
    await expect(storeModule.WorkspaceStore.moveResource(firstContent, missing)).resolves.toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });

    expect(storeModule.WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("unsubscribe 이후에는 알리지 않고 공개 snapshot 전체를 immutable하게 유지한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage = storage(null);
    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    const listener = vi.fn();
    const unsubscribe = storeModule.WorkspaceStore.subscribe(listener);
    unsubscribe();

    await storeModule.WorkspaceStore.renameFolder(inbox, "Writing");

    const current = storeModule.WorkspaceStore.getSnapshot();
    expect(listener).not.toHaveBeenCalled();
    expect(Object.isFrozen(current)).toBe(true);
    expect(Object.isFrozen(current.folders)).toBe(true);
    expect(Object.isFrozen(current.folders[0])).toBe(true);
    expect(Object.isFrozen(current.folders[0]?.ref)).toBe(true);
    expect(Object.isFrozen(current.placements)).toBe(true);
    expect(Object.isFrozen(current.placements[0])).toBe(true);
  });

  it("save 실패는 committed snapshot을 유지하고 tagged persistence failure를 반환한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage = storage(null);
    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    fakeStorage.save.mockRejectedValueOnce(new Error("quota"));
    const listener = vi.fn();
    storeModule.WorkspaceStore.subscribe(listener);

    const result = await storeModule.WorkspaceStore.renameFolder(inbox, "Writing");

    expect(result).toEqual({
      ok: false,
      reason: "storage-write-failed",
      committed: true,
      value: storeModule.WorkspaceStore.getSnapshot(),
    });
    expect(storeModule.WorkspaceStore.getSnapshot().folders[0]?.name).toBe("Writing");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("initialize save 실패도 reconciled snapshot을 노출하되 persistence failure를 반환한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage: WorkspaceStorage = {
      load: vi.fn(() => Promise.resolve(null)),
      save: vi.fn(() => Promise.reject(new Error("quota"))),
    };

    const result = await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent, secondContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });

    expect(result).toMatchObject({ ok: false, reason: "storage-write-failed", committed: true });
    expect(storeModule.WorkspaceStore.getSnapshot().placements).toContainEqual({
      resource: secondContent,
      parent: inbox,
    });
  });

  it("같은 dependency 초기화는 idempotent하고 다른 dependency 재결합은 거부한다", async () => {
    const storeModule = await loadStore();
    const fakeStorage = storage(null);
    const initialization = {
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    };

    const first = await storeModule.WorkspaceStore.initialize(initialization);
    const second = await storeModule.WorkspaceStore.initialize(initialization);

    expect(second).toBe(first);
    expect(fakeStorage.load).toHaveBeenCalledOnce();
    expect(fakeStorage.save).toHaveBeenCalledOnce();
    await expect(
      storeModule.WorkspaceStore.initialize({ ...initialization, storage: storage(null) }),
    ).rejects.toBeInstanceOf(storeModule.WorkspaceStoreAlreadyInitializedError);
  });

  it("초기화 전 snapshot과 command 접근을 거부한다", async () => {
    const storeModule = await loadStore();

    expect(() => storeModule.WorkspaceStore.getSnapshot()).toThrow(
      storeModule.WorkspaceStoreNotInitializedError,
    );
    expect(() => storeModule.WorkspaceStore.renameFolder(inbox, "Writing")).toThrow(
      storeModule.WorkspaceStoreNotInitializedError,
    );
  });
});

describe("WorkspaceStore Folder 명령", () => {
  const initialize = async () => {
    const { WorkspaceStore } = await loadStore();
    const fakeStorage = storage(null);
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    fakeStorage.save.mockClear();
    return { WorkspaceStore, fakeStorage };
  };

  it("다른 kind를 붙인 Folder 이동은 self-parent, 순환과 no-op 검사 전에 거부한다", async () => {
    const child = ref("folder", "000000000040");
    mockUuid(child.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    await WorkspaceStore.createFolder("자식", inbox);
    const before = WorkspaceStore.getSnapshot();
    fakeStorage.save.mockClear();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    for (const kind of ["content", "external-shortcut"] as const) {
      for (const parent of [inbox, child, null]) {
        await expect(
          WorkspaceStore.moveResource(createResourceRef(kind, inbox.id), parent),
        ).resolves.toEqual({ ok: false, reason: "resource-kind-mismatch" });
      }
    }
    await expect(
      WorkspaceStore.moveResource(createResourceRef("folder", firstContent.id), null),
    ).resolves.toEqual({ ok: false, reason: "resource-kind-mismatch" });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("Folder 생성, Desktop 이동과 이름 변경을 현재 상태에 반영한다", async () => {
    const created = ref("folder", "000000000020");
    mockUuid(created.id);
    const { WorkspaceStore } = await initialize();
    const original = WorkspaceStore.getSnapshot();

    await WorkspaceStore.createFolder("Projects", inbox);
    expect(WorkspaceStore.getSnapshot().placements.at(-1)).toEqual({
      resource: created,
      parent: inbox,
    });
    await WorkspaceStore.moveResource(created, null);
    await WorkspaceStore.renameFolder(created, "Work");

    expect(WorkspaceStore.getSnapshot().folders.at(-1)).toEqual({ ref: created, name: "Work" });
    expect(WorkspaceStore.getSnapshot().placements.at(-1)).toEqual({
      resource: created,
      parent: null,
    });
    expect(original).toEqual(seed());
    expect(JSON.parse(JSON.stringify(WorkspaceStore.getSnapshot()))).toEqual(
      WorkspaceStore.getSnapshot(),
    );
  });

  it("Content를 Desktop으로 옮겼다가 원래 Folder로 이동한다", async () => {
    const { WorkspaceStore } = await initialize();
    await WorkspaceStore.moveResource(firstContent, null);
    expect(WorkspaceStore.getSnapshot().placements[1]?.parent).toBeNull();
    await WorkspaceStore.moveResource(firstContent, inbox);
    expect(WorkspaceStore.getSnapshot()).toEqual(seed());
  });

  it("없는 parent, self-parent와 descendant-parent cycle은 현재 상태를 바꾸지 않는다", async () => {
    const child = ref("folder", "000000000021");
    const missing = ref("folder", "000000000022");
    mockUuid(child.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    await WorkspaceStore.createFolder("Child", inbox);
    const before = WorkspaceStore.getSnapshot();
    fakeStorage.save.mockClear();

    await expect(WorkspaceStore.moveResource(inbox, missing)).resolves.toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });
    await expect(WorkspaceStore.moveResource(inbox, inbox)).resolves.toEqual({
      ok: false,
      reason: "self-parent",
    });
    await expect(WorkspaceStore.moveResource(inbox, child)).resolves.toEqual({
      ok: false,
      reason: "folder-cycle",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("없는 Folder와 Resource 또는 동일 값 요청은 저장과 알림을 만들지 않는다", async () => {
    const missing = ref("folder", "000000000023");
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);

    await expect(WorkspaceStore.createFolder("Nested", missing)).resolves.toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });
    await expect(WorkspaceStore.renameFolder(missing, "Missing")).resolves.toEqual({
      ok: false,
      reason: "folder-not-found",
    });
    await expect(WorkspaceStore.moveResource(missing, null)).resolves.toEqual({
      ok: false,
      reason: "resource-not-found",
    });
    await expect(WorkspaceStore.renameFolder(inbox, "Blog")).resolves.toEqual({
      ok: false,
      reason: "no-op",
    });
    await expect(WorkspaceStore.moveResource(inbox, null)).resolves.toEqual({
      ok: false,
      reason: "no-op",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(fakeStorage.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("내부 UUID 발급이 기존 ID와 충돌하면 생성을 거부한다", async () => {
    mockUuid(inbox.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    await expect(WorkspaceStore.createFolder("Duplicate", null)).resolves.toEqual({
      ok: false,
      reason: "duplicate-resource-id",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("동시에 요청한 명령도 앞 명령이 반영한 최신 상태를 사용한다", async () => {
    const created = ref("folder", "000000000024");
    mockUuid(created.id);
    const { WorkspaceStore } = await initialize();
    const creation = WorkspaceStore.createFolder("Projects", inbox);
    const rename = WorkspaceStore.renameFolder(created, "Work");
    const move = WorkspaceStore.moveResource(created, null);
    expect((await Promise.all([creation, rename, move])).every((result) => result.ok)).toBe(true);
    expect(WorkspaceStore.getSnapshot().folders.at(-1)).toEqual({ ref: created, name: "Work" });
    expect(WorkspaceStore.getSnapshot().placements.at(-1)).toEqual({
      resource: created,
      parent: null,
    });
  });

  it("inbox 복구와 Folder 생성이 같은 내부 발급 경로를 사용한다", async () => {
    const recovered = ref("folder", "000000000025");
    const created = ref("folder", "000000000026");
    const uuid = mockUuid(recovered.id).mockReturnValueOnce(
      recovered.id as `${string}-${string}-${string}-${string}-${string}`,
    );
    const { WorkspaceStore } = await loadStore();
    await WorkspaceStore.initialize({
      storage: storage({ schemaVersion: 1, contentInbox: inbox, folders: [], placements: [] }),
      seed: seed(),
      contentCatalog: catalogFor([]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    uuid.mockReturnValue(created.id as `${string}-${string}-${string}-${string}-${string}`);
    await WorkspaceStore.createFolder("Child", recovered);
    expect(uuid).toHaveBeenCalledTimes(2);
    expect(WorkspaceStore.getSnapshot().contentInbox).toEqual(recovered);
    expect(WorkspaceStore.getSnapshot().folders.at(-1)?.ref).toEqual(created);
  });
});
