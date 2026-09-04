import { describe, expect, it } from "vitest";

import { createResourceRef, type FolderResourceRef, parseResourceId } from "../resources/index.js";
import type { IdGenerator } from "./idGenerator.js";
import type { WorkspaceState } from "./model.js";
import { createFolder, moveResource, renameFolder } from "./operations.js";
import { createWorkspaceSeed } from "./seed.js";

const folder = (suffix: string): FolderResourceRef =>
  createResourceRef("folder", `00000000-0000-4000-8000-${suffix}`);

const idGenerator = (suffix: string): IdGenerator => ({
  generateId: () => parseResourceId(`00000000-0000-4000-8000-${suffix}`),
});

const expectUnchanged = (state: WorkspaceState, before: string): void => {
  expect(JSON.stringify(state)).toBe(before);
};

describe("Workspace pure operations", () => {
  it("Folder를 중첩 생성하고 이름을 identity 변경 없이 바꾼다", () => {
    const inbox = folder("000000000001");
    const initial = createWorkspaceSeed({ contentInbox: inbox, content: [] });

    const created = createFolder(initial, "Projects", inbox, idGenerator("000000000002"));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const projects = folder("000000000002");
    expect(created.value.folders.at(-1)).toEqual({ ref: projects, name: "Projects" });
    expect(created.value.placements.at(-1)).toEqual({ resource: projects, parent: inbox });

    const moved = moveResource(created.value, projects, null);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.value.placements.at(-1)).toEqual({ resource: projects, parent: null });

    const renamed = renameFolder(moved.value, projects, "Work");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;

    expect(renamed.value.folders.at(-1)).toEqual({ ref: projects, name: "Work" });
    expect(renamed.value.placements.at(-1)).toEqual({ resource: projects, parent: null });
    expect(initial.folders).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(renamed))).toEqual(renamed);
  });

  it("Resource를 Folder와 Desktop 사이에서 이동한다", () => {
    const inbox = folder("000000000001");
    const content = createResourceRef("content", "00000000-0000-4000-8000-000000000002");
    const state = createWorkspaceSeed({ contentInbox: inbox, content: [content] });

    const movedToDesktop = moveResource(state, content, null);
    expect(movedToDesktop.ok).toBe(true);
    if (!movedToDesktop.ok) return;
    expect(movedToDesktop.value.placements[1]).toEqual({ resource: content, parent: null });

    const movedBack = moveResource(movedToDesktop.value, content, inbox);
    expect(movedBack.ok).toBe(true);
    if (!movedBack.ok) return;
    expect(movedBack.value).toEqual(state);
    expect(movedBack.value).not.toBe(state);
  });

  it("없는 parent, self-parent와 descendant-parent cycle을 거부한다", () => {
    const root = folder("000000000001");
    const child = folder("000000000002");
    const missing = folder("000000000099");
    const seeded = createWorkspaceSeed({ contentInbox: root, content: [] });
    const created = createFolder(seeded, "Child", root, idGenerator("000000000002"));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const before = JSON.stringify(created.value);
    expect(moveResource(created.value, root, missing)).toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });
    expect(moveResource(created.value, root, root)).toEqual({
      ok: false,
      reason: "self-parent",
    });
    expect(moveResource(created.value, root, child)).toEqual({
      ok: false,
      reason: "folder-cycle",
    });
    expectUnchanged(created.value, before);
  });

  it("실패와 no-op은 원래 state 객체를 바꾸지 않는다", () => {
    const inbox = folder("000000000001");
    const missing = folder("000000000099");
    const state = createWorkspaceSeed({ contentInbox: inbox, content: [] });
    const before = JSON.stringify(state);

    expect(createFolder(state, "Nested", missing, idGenerator("000000000002"))).toEqual({
      ok: false,
      reason: "parent-folder-not-found",
    });
    expect(renameFolder(state, missing, "Missing")).toEqual({
      ok: false,
      reason: "folder-not-found",
    });
    expect(renameFolder(state, inbox, "Blog")).toEqual({ ok: false, reason: "no-op" });
    expect(moveResource(state, inbox, null)).toEqual({ ok: false, reason: "no-op" });
    expectUnchanged(state, before);
  });

  it("IdGenerator가 기존 ResourceId를 반환하면 생성을 거부한다", () => {
    const inbox = folder("000000000001");
    const state = createWorkspaceSeed({ contentInbox: inbox, content: [] });
    const before = JSON.stringify(state);

    expect(createFolder(state, "Duplicate", null, idGenerator("000000000001"))).toEqual({
      ok: false,
      reason: "duplicate-resource-id",
    });
    expectUnchanged(state, before);
  });
});
