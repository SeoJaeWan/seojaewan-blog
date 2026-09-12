import { describe, expect, it } from "vitest";

import type { FileExplorerSidebarItem } from "../../../../../../../headless/folders/index.js";
import { createResourceRef } from "../../../../../../../headless/resources/index.js";
import type { WorkspaceCommittedResult } from "../../../../../../../headless/workspace/index.js";
import { collectFolderIds, createDraft, editableError, findCreatedFolderId } from "./index.js";

const parent = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const child = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const created = createResourceRef("folder", "30000000-0000-4000-8000-000000000003");

describe("sidebar inline edit", () => {
  it("create와 rename 요청을 오류 없는 수정 draft로 변환한다", () => {
    expect(createDraft({ status: "inline-edit-request", kind: "create", parent, initialName: "새 폴더" })).toEqual({
      kind: "create", parent, value: "새 폴더", error: null, submitting: false,
    });
    expect(createDraft({ status: "inline-edit-request", kind: "rename", folder: child, initialName: "React" })).toEqual({
      kind: "rename", folder: child, value: "React", error: null, submitting: false,
    });
  });

  it("중첩 tree의 Folder identity를 입력 tree를 바꾸지 않고 수집한다", () => {
    const childItem = { kind: "folder", ref: child, children: [] } as unknown as FileExplorerSidebarItem;
    const items = [{ kind: "folder", ref: parent, children: [childItem] }] as unknown as readonly FileExplorerSidebarItem[];
    expect([...collectFolderIds(items)]).toEqual([parent.id, child.id]);
    expect(items[0].children).toEqual([childItem]);
  });

  it("동일 parent의 신규 Folder만 commit 결과에서 찾는다", () => {
    const committed = {
      status: "committed",
      value: { placements: [{ resource: child, parent }, { resource: created, parent }] },
    } as unknown as WorkspaceCommittedResult;
    expect(findCreatedFolderId(committed, new Set([child.id]), { ...parent })).toBe(created.id);
    expect(findCreatedFolderId(committed, new Set([child.id, created.id]), parent)).toBeNull();
  });

  it("Workspace name 거절 사유를 editor 메시지로 변환한다", () => {
    const rejected = {
      status: "rejected",
      result: { ok: false, reason: "folder-name-empty" },
    } as unknown as WorkspaceCommittedResult;
    expect(editableError(rejected)).toBe("폴더 이름을 입력하세요.");
    expect(editableError({ status: "no-op", result: { ok: false, reason: "no-op" } } as unknown as WorkspaceCommittedResult)).toBeNull();
  });
});
