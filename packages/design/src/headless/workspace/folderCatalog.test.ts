import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { createResourceRef, type Folder, type ResourceRef } from "../resources/index.js";
import type { WorkspaceState } from "./model.js";
import type { WorkspaceStorage } from "./workspaceStorage.js";

const ref = <Kind extends ResourceRef["kind"]>(kind: Kind, suffix: string) =>
  createResourceRef(kind, `00000000-0000-4000-8000-${suffix}`);

const inbox = ref("folder", "000000000001");
const created = ref("folder", "000000000002");
const missing = ref("folder", "000000000003");

const initialState: WorkspaceState = {
  schemaVersion: 1,
  contentInbox: inbox,
  folders: [{ ref: inbox, name: "Blog" }],
  placements: [{ resource: inbox, parent: null }],
};

beforeEach(() => {
  vi.resetModules();
});

describe("FolderCatalog", () => {
  it("현재 Workspace snapshot의 Folder를 복사 없이 typed has/get/list로 읽는다", async () => {
    const { FolderCatalog, WorkspaceStore } = await import("./index.js");
    const fakeStorage: WorkspaceStorage = {
      load: vi.fn(() => Promise.resolve(initialState)),
      save: vi.fn(() => Promise.resolve()),
    };
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: initialState,
      currentContent: [],
      resourceLookup: { hasResource: () => false },
      idGenerator: { generateId: vi.fn(() => created.id) },
    });

    expect(FolderCatalog.has(inbox.id)).toBe(true);
    expect(FolderCatalog.has(missing.id)).toBe(false);
    expect(FolderCatalog.get(inbox.id)).toEqual({ ref: inbox, name: "Blog" });
    expect(FolderCatalog.get(missing.id)).toBeUndefined();
    expect(FolderCatalog.list()).toBe(WorkspaceStore.getSnapshot().folders);
    expectTypeOf(FolderCatalog.get(inbox.id)).toEqualTypeOf<Folder | undefined>();
  });

  it("create와 rename commit을 즉시 반영하고 Desktop Folder를 합성하지 않는다", async () => {
    const { FolderCatalog, WorkspaceStore } = await import("./index.js");
    const fakeStorage: WorkspaceStorage = {
      load: vi.fn(() => Promise.resolve(initialState)),
      save: vi.fn(() => Promise.resolve()),
    };
    await WorkspaceStore.initialize({
      storage: fakeStorage,
      seed: initialState,
      currentContent: [],
      resourceLookup: { hasResource: () => false },
      idGenerator: { generateId: vi.fn(() => created.id) },
    });

    await WorkspaceStore.createFolder("Projects", null);
    expect(FolderCatalog.get(created.id)).toEqual({ ref: created, name: "Projects" });
    expect(FolderCatalog.list()).toHaveLength(2);

    await WorkspaceStore.renameFolder(created, "Archive");
    expect(FolderCatalog.get(created.id)?.name).toBe("Archive");

    await WorkspaceStore.moveResource(created, inbox);
    expect(FolderCatalog.get(created.id)).toEqual({ ref: created, name: "Archive" });
    expect(FolderCatalog.list()).toBe(WorkspaceStore.getSnapshot().folders);
    expect(FolderCatalog.list().some((folder) => folder.ref.id === missing.id)).toBe(false);
  });
});
