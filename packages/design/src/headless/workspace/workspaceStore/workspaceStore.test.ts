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

/**
 * 고정 UUID suffix와 Resource kind로 테스트용 ref를 만든다.
 */
const ref = <Kind extends ResourceRef["kind"]>(kind: Kind, suffix: string) =>
  createResourceRef(kind, `00000000-0000-4000-8000-${suffix}`);

const inbox = ref("folder", "000000000001");
const firstContent = ref("content", "000000000002");
const secondContent = ref("content", "000000000003");

/**
 * 테스트마다 독립된 초기 Workspace 배치와 Folder 원본을 만든다.
 */
const seed = (): WorkspaceState => ({
  schemaVersion: 1,
  contentInbox: inbox,
  folders: [{ ref: inbox, name: "Blog" }],
  placements: [
    { resource: inbox, parent: null },
    { resource: firstContent, parent: inbox },
  ],
});

/**
 * Content 원본 목록으로 Catalog를 만들고 존재 조회 순서를 기록한다.
 */
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
    /**
     * Content 존재 여부를 실제 Catalog에서 조회하고 관찰용 event를 남긴다.
     */
    has(id: ContentResourceRef["id"]) {
      events.push("lookup:content");
      return catalog.has(id);
    },
  };
};

/**
 * UUID 발급 결과를 고정해 생성 성공·충돌을 결정적으로 검증한다.
 */
const mockUuid = (generated = ref("folder", "000000000099").id) =>
  vi
    .spyOn(globalThis.crypto, "randomUUID")
    .mockReturnValue(generated as `${string}-${string}-${string}-${string}-${string}`);

/**
 * load 결과와 저장 호출 순서를 제어·관찰하는 storage fake를 만든다.
 */
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

/**
 * 테스트에서 모듈 격리된 WorkspaceStore를 동적으로 읽는다.
 */
const loadStore = () => import("./index.js");

/**
 * 완료와 실패 시점을 테스트가 제어할 수 있는 Promise와 resolver를 만든다.
 */
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

  describe("initialize", () => {
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

  describe("통합 시나리오", () => {
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
  });

  describe("createFolder", () => {
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
  });

  describe("subscribe", () => {
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
  });
});

/**
 * Folder 명령마다 초기화된 Store와 저장 호출 관찰자를 독립적으로 준비한다.
 */
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

describe("WorkspaceStore.createFolder", () => {
  it("이름과 부모로 Folder를 생성하고 변경을 한 번 알리고 저장한다", async () => {
    const created = ref("folder", "000000000020");
    mockUuid(created.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    await WorkspaceStore.createFolder("Projects", inbox);
    const state = WorkspaceStore.getSnapshot();
    expect(state.folders.at(-1)).toEqual({ ref: created, name: "Projects" });
    expect(state.placements.at(-1)).toEqual({ resource: created, parent: inbox });
    expect(before).toEqual(seed());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
  it("부모가 없으면 거부하고 상태·알림·저장을 유지한다", async () => {
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    expect(await WorkspaceStore.createFolder("Nested", ref("folder", "000000000023"))).toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
  it("UUID 충돌은 거부하고 상태·알림·저장을 유지한다", async () => {
    mockUuid(inbox.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    expect(await WorkspaceStore.createFolder("Duplicate", null)).toEqual({
      ok: false,
      reason: "duplicate-resource-id",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it.each([
    ["", "folder-name-empty"],
    ["bad?name", "folder-name-invalid-character"],
    ["NUL.txt", "folder-name-reserved"],
    ["name.", "folder-name-trailing-space-or-period"],
    ["📁".repeat(256), "folder-name-too-long"],
  ] as const)("invalid 이름 %j은 %s로 거절하고 commit하지 않는다", async (name, reason) => {
    const generator = mockUuid();
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);

    expect(await WorkspaceStore.createFolder(name, null)).toEqual({ ok: false, reason });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  it("NFC로 저장하고 같은 parent의 normalization/case-insensitive 중복을 거절한다", async () => {
    const generator = mockUuid();
    const { WorkspaceStore, fakeStorage } = await initialize();

    await expect(WorkspaceStore.createFolder("bLoG", null)).resolves.toEqual({
      ok: false,
      reason: "folder-name-conflict",
    });
    expect(generator).not.toHaveBeenCalled();

    await WorkspaceStore.createFolder("Cafe\u0301", inbox);
    expect(WorkspaceStore.getSnapshot().folders.at(-1)?.name).toBe("Caf\u00e9");
    fakeStorage.save.mockClear();
    await expect(WorkspaceStore.createFolder("CAF\u00c9", inbox)).resolves.toEqual({
      ok: false,
      reason: "folder-name-conflict",
    });
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
});

describe("WorkspaceStore.renameFolder", () => {
  it("이름만 변경하고 placement와 원본 snapshot을 유지한다", async () => {
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    await WorkspaceStore.renameFolder(inbox, "Writing");
    const state = WorkspaceStore.getSnapshot();
    expect(state.folders[0]).toEqual({ ref: inbox, name: "Writing" });
    expect(state.placements).toEqual(before.placements);
    expect(before.folders[0].name).toBe("Blog");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(state);
  });
  it.each([
    { name: "Missing", target: ref("folder", "000000000023"), reason: "folder-not-found" },
    { name: "Blog", target: inbox, reason: "no-op" },
  ])("$reason 요청은 상태·알림·저장을 유지한다", async ({ name, target, reason }) => {
    const { WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    expect(await WorkspaceStore.renameFolder(target, name)).toEqual({ ok: false, reason });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("invalid 이름과 같은 parent의 sibling 중복을 거절하고 case-only rename은 허용한다", async () => {
    const sibling = ref("folder", "000000000027");
    mockUuid(sibling.id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    await WorkspaceStore.createFolder("Archive", null);
    fakeStorage.save.mockClear();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);

    await expect(WorkspaceStore.renameFolder(sibling, "CON.log")).resolves.toEqual({
      ok: false,
      reason: "folder-name-reserved",
    });
    await expect(WorkspaceStore.renameFolder(sibling, "BLOG")).resolves.toEqual({
      ok: false,
      reason: "folder-name-conflict",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();

    await expect(WorkspaceStore.renameFolder(sibling, "archive")).resolves.toMatchObject({
      ok: true,
    });
    expect(WorkspaceStore.getSnapshot().folders.at(-1)?.name).toBe("archive");
  });
});

describe("WorkspaceStore.moveResource", () => {
  it.each(["content", "folder"] as const)(
    "%s를 Desktop으로 이동하고 나머지 데이터를 보존한다",
    async (kind) => {
      const created = ref("folder", "000000000020");
      mockUuid(created.id);
      const { WorkspaceStore, fakeStorage } = await initialize();
      if (kind === "folder") await WorkspaceStore.createFolder("Projects", inbox);
      const target = kind === "folder" ? created : firstContent;
      const before = WorkspaceStore.getSnapshot();
      fakeStorage.save.mockClear();
      const listener = vi.fn();
      WorkspaceStore.subscribe(listener);
      await WorkspaceStore.moveResource(target, null);
      const state = WorkspaceStore.getSnapshot();
      expect(state.placements.find((p) => p.resource.id === target.id)?.parent).toBeNull();
      expect(state.folders).toEqual(before.folders);
      expect(before.placements.find((p) => p.resource.id === target.id)?.parent).toEqual(inbox);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(state);
    },
  );
  it("Desktop의 Content를 Folder로 이동한다", async () => {
    const { WorkspaceStore } = await initialize();
    await WorkspaceStore.moveResource(firstContent, null);
    await WorkspaceStore.moveResource(firstContent, inbox);
    expect(WorkspaceStore.getSnapshot()).toEqual(seed());
  });
  it.each([
    { target: inbox, parent: ref("folder", "000000000022"), reason: "parent-folder-not-found" },
    {
      target: firstContent,
      parent: ref("folder", "000000000022"),
      reason: "parent-folder-not-found",
    },
    { target: inbox, parent: inbox, reason: "self-parent" },
    { target: inbox, parent: ref("folder", "000000000021"), reason: "folder-cycle" },
    { target: ref("folder", "000000000023"), parent: null, reason: "resource-not-found" },
    { target: inbox, parent: null, reason: "no-op" },
  ])("$reason 이동은 상태·알림·저장을 유지한다", async ({ target, parent, reason }) => {
    mockUuid(ref("folder", "000000000021").id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    await WorkspaceStore.createFolder("Child", inbox);
    const before = WorkspaceStore.getSnapshot();
    fakeStorage.save.mockClear();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    expect(await WorkspaceStore.moveResource(target, parent)).toEqual({ ok: false, reason });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
  it.each(
    (["content", "external-shortcut"] as const).flatMap((kind) =>
      [null, inbox, ref("folder", "000000000040")].map((parent) => ({ kind, parent })),
    ),
  )("Folder ID에 $kind kind를 붙인 이동을 거부한다", async ({ kind, parent }) => {
    mockUuid(ref("folder", "000000000040").id);
    const { WorkspaceStore, fakeStorage } = await initialize();
    await WorkspaceStore.createFolder("Child", inbox);
    fakeStorage.save.mockClear();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    expect(await WorkspaceStore.moveResource(createResourceRef(kind, inbox.id), parent)).toEqual({
      ok: false,
      reason: "resource-kind-mismatch",
    });
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
});

describe("WorkspaceStore queue·ID 통합 시나리오", () => {
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

  it("명령 context는 commit을 저장보다 먼저 알리고 기존 Promise는 저장 완료를 반환한다", async () => {
    mockUuid();
    const gate = deferred<void>();
    const events: string[] = [];
    const fakeStorage = storage(null);
    const { WorkspaceStore } = await loadStore();
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      contentCatalog: catalogFor([firstContent]),
      externalShortcutCatalog: createStaticCatalog([]),
    });
    fakeStorage.save.mockImplementationOnce(() => {
      events.push("save");
      return gate.promise;
    });
    WorkspaceStore.subscribe(() => events.push("subscriber"));

    const command = WorkspaceStore.createFolder("자료", null, {
      onCommit: () => events.push("context"),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["context", "subscriber", "save"]);
    gate.resolve();
    await expect(command).resolves.toMatchObject({ ok: true });
  });
});
