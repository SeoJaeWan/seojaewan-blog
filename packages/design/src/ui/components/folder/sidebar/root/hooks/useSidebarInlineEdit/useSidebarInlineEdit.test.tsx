import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerAction, FileExplorerControllerActions, FileExplorerExecution, FileExplorerSidebarContextEntry, FileExplorerSidebarView } from "../../../../../../../headless/folders/index.js";
import { createResourceRef } from "../../../../../../../headless/resources/index.js";
import type { WorkspaceCommittedResult, WorkspaceOperationHandle } from "../../../../../../../headless/workspace/index.js";
import { useSidebarInlineEdit } from "./index.js";

afterEach(cleanup);

const parent = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const created = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const sidebar = {
  expandedFolderIds: [],
  items: [{ ref: parent, children: [] }],
} as unknown as FileExplorerSidebarView;
const entry = {
  action: { type: "file-explorer.folder.create.begin", parent, suggestedName: "새 폴더" },
} as FileExplorerSidebarContextEntry;

type Deferred<Value> = { promise: Promise<Value>; resolve: (value: Value) => void };
const deferred = <Value,>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("useSidebarInlineEdit", () => {
  it("create 요청의 parent를 펼치고 commit된 신규 Folder focus를 예약한다", async () => {
    const committed: WorkspaceCommittedResult = {
      status: "committed",
      value: { placements: [{ resource: parent, parent: null }, { resource: created, parent }] },
    } as unknown as WorkspaceCommittedResult;
    const handle = { committed: Promise.resolve(committed) } as WorkspaceOperationHandle;
    const execute = vi.fn((action: FileExplorerAction): FileExplorerExecution =>
      action.type === "file-explorer.folder.create.begin"
        ? { status: "inline-edit-request", kind: "create", parent, initialName: "새 폴더" }
        : handle,
    );
    const actions = { execute } satisfies FileExplorerControllerActions;
    const requestFocus = vi.fn();
    const hook = renderHook(() => useSidebarInlineEdit({ actions, requestFocus, sidebar }));

    act(() => hook.result.current.executeEntry(entry));
    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.sidebar.expansion.set",
      expandedFolderIds: [parent.id],
    });
    act(() => hook.result.current.changeDraft("작성"));
    await act(() => hook.result.current.commitDraft());

    expect(execute).toHaveBeenCalledWith({ type: "file-explorer.folder.create", parent, name: "작성" });
    expect(requestFocus).toHaveBeenCalledExactlyOnceWith(`folder:${created.id}`);
    expect(hook.result.current.draft).toBeNull();
  });

  it("제출 중 중복 commit과 cancel을 막고 거절 오류를 수정 가능한 draft에 남긴다", async () => {
    const committed = deferred<WorkspaceCommittedResult>();
    const handle = { committed: committed.promise } as WorkspaceOperationHandle;
    const execute = vi.fn((action: FileExplorerAction): FileExplorerExecution =>
      action.type === "file-explorer.folder.create.begin"
        ? { status: "inline-edit-request", kind: "create", parent, initialName: "새 폴더" }
        : handle,
    );
    const actions = { execute } satisfies FileExplorerControllerActions;
    const hook = renderHook(() => useSidebarInlineEdit({ actions, requestFocus: vi.fn(), sidebar }));
    act(() => hook.result.current.executeEntry(entry));

    let first!: Promise<void>;
    act(() => {
      first = hook.result.current.commitDraft();
      void hook.result.current.commitDraft();
      hook.result.current.cancelDraft();
    });
    expect(execute.mock.calls.filter(([action]) => action.type === "file-explorer.folder.create")).toHaveLength(1);
    expect(hook.result.current.draft?.submitting).toBe(true);

    committed.resolve({ status: "rejected", result: { ok: false, reason: "folder-name-empty" } } as unknown as WorkspaceCommittedResult);
    await act(() => first);
    expect(hook.result.current.draft).toMatchObject({ submitting: false, error: "폴더 이름을 입력하세요." });
    act(() => hook.result.current.changeDraft("다시 입력"));
    expect(hook.result.current.draft?.error).toBeNull();
  });
});
