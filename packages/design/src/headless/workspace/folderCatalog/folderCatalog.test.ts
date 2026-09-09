import { beforeEach, describe, expect, it, vi } from "vitest";

import { createResourceRef, createStaticCatalog, type ResourceRef } from "../../resources/index.js";
import type { WorkspaceState } from "../model/index.js";
import type { WorkspaceStorage } from "../workspaceStore/workspaceStorage/index.js";

/**
 * 고정 UUID suffix와 Resource kind로 테스트용 ref를 만든다.
 */
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
  vi.restoreAllMocks();
  vi.resetModules();
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
    created.id as `${string}-${string}-${string}-${string}-${string}`,
  );
});

/**
 * 읽기 메서드마다 실제 WorkspaceStore와 저장 관찰자를 독립적으로 연결한다.
 */
const initialize = async () => {
  const { FolderCatalog } = await import("./index.js");
  const { WorkspaceStore } = await import("../workspaceStore/index.js");
  const fakeStorage = {
    load: vi.fn<WorkspaceStorage["load"]>(() => Promise.resolve(initialState)),
    save: vi.fn<WorkspaceStorage["save"]>(() => Promise.resolve()),
  };
  await WorkspaceStore.initialize({
    storage: fakeStorage,
    seed: initialState,
    contentCatalog: createStaticCatalog([]),
    externalShortcutCatalog: createStaticCatalog([]),
  });
  fakeStorage.save.mockClear();
  return { FolderCatalog, WorkspaceStore, fakeStorage };
};

describe("FolderCatalog.has", () => {
  it("현재 Folder의 ID가 있으면 true를 반환한다", async () => {
    const { FolderCatalog } = await initialize();
    expect(FolderCatalog.has(inbox.id)).toBe(true);
  });
  it("없는 ID이면 false를 반환한다", async () => {
    const { FolderCatalog } = await initialize();
    expect(FolderCatalog.has(missing.id)).toBe(false);
  });
});

describe("FolderCatalog.get", () => {
  it("현재 Folder 원본을 반환한다", async () => {
    const { FolderCatalog } = await initialize();
    expect(FolderCatalog.get(inbox.id)).toEqual({ ref: inbox, name: "Blog" });
  });
  it("없는 ID이면 undefined를 반환한다", async () => {
    const { FolderCatalog } = await initialize();
    expect(FolderCatalog.get(missing.id)).toBeUndefined();
  });
});

describe("FolderCatalog.list", () => {
  it("현재 Workspace Folder 목록을 그대로 반환하며 Desktop을 합성하지 않는다", async () => {
    const { FolderCatalog, WorkspaceStore } = await initialize();
    expect(FolderCatalog.list()).toBe(WorkspaceStore.getSnapshot().folders);
    expect(FolderCatalog.list()).toEqual([{ ref: inbox, name: "Blog" }]);
  });
});

describe.each(["has", "get", "list"] as const)("FolderCatalog.%s lifecycle", (method) => {
  it("초기화 전에는 조회를 거부한다", async () => {
    const { FolderCatalog } = await import("./index.js");
    expect(() => FolderCatalog[method](inbox.id)).toThrow();
  });
  it("읽기는 snapshot·알림·저장을 변경하지 않는다", async () => {
    const { FolderCatalog, WorkspaceStore, fakeStorage } = await initialize();
    const before = WorkspaceStore.getSnapshot();
    const listener = vi.fn();
    WorkspaceStore.subscribe(listener);
    FolderCatalog[method](inbox.id);
    expect(WorkspaceStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
});

describe("FolderCatalog·WorkspaceStore 통합", () => {
  it("생성·이름 변경·이동 이후의 최신 원본을 조회한다", async () => {
    const { FolderCatalog, WorkspaceStore } = await initialize();
    await WorkspaceStore.createFolder("Projects", null);
    expect(FolderCatalog.get(created.id)).toEqual({ ref: created, name: "Projects" });
    await WorkspaceStore.renameFolder(created, "Archive");
    expect(FolderCatalog.get(created.id)?.name).toBe("Archive");
    await WorkspaceStore.moveResource(created, inbox);
    expect(FolderCatalog.get(created.id)).toEqual({ ref: created, name: "Archive" });
    expect(FolderCatalog.list()).toBe(WorkspaceStore.getSnapshot().folders);
  });
});
