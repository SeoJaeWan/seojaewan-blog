import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ContentResourceRef,
  createResourceRef,
  type ResourceLookup,
  type ResourceRef,
} from "../resources/index.js";
import type { IdGenerator } from "./idGenerator.js";
import type { WorkspaceState } from "./model.js";
import type { WorkspaceStorage } from "./workspaceStorage.js";

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

const lookupFor = (refs: readonly ResourceRef[], events: string[] = []): ResourceLookup => {
  const keys = new Set(refs.map((resource) => `${resource.kind}:${resource.id}`));
  return {
    hasResource(resource) {
      events.push(`lookup:${resource.kind}`);
      return keys.has(`${resource.kind}:${resource.id}`);
    },
  };
};

const idGenerator = (generated = ref("folder", "000000000099").id): IdGenerator => ({
  generateId: vi.fn(() => generated),
});

const storage = (
  saved: unknown,
  events: string[] = [],
): WorkspaceStorage & { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } => ({
  load: vi.fn(() => {
    events.push("load");
    return Promise.resolve(saved);
  }),
  save: vi.fn(() => {
    events.push("save");
    return Promise.resolve();
  }),
});

const loadStore = () => import("./workspaceStore.js");

beforeEach(() => {
  vi.resetModules();
});

describe("WorkspaceStore", () => {
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
      currentContent,
      resourceLookup: lookupFor(currentContent, events),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
    const generator = idGenerator(recoveredInbox.id);
    const storeModule = await loadStore();
    const fakeStorage = storage(saved);

    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: generator,
    });

    expect(generator.generateId).toHaveBeenCalledOnce();
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
    const generator = idGenerator(created.id);
    const initialization = {
      storage: fakeStorage,
      seed: seed(),
      currentContent: [firstContent] as readonly ContentResourceRef[],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: generator,
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
    expect(generator.generateId).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("거부와 no-op command는 snapshot, 알림, 저장을 바꾸지 않는다", async () => {
    const missing = ref("folder", "000000000013");
    const storeModule = await loadStore();
    const fakeStorage = storage(null);
    await storeModule.WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: seed(),
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent],
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent, secondContent],
      resourceLookup: lookupFor([firstContent, secondContent]),
      idGenerator: idGenerator(),
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
      currentContent: [firstContent] as const,
      resourceLookup: lookupFor([firstContent]),
      idGenerator: idGenerator(),
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
