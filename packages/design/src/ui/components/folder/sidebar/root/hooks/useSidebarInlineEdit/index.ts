import { useRef, useState } from "react";

import type {
  FileExplorerControllerActions,
  FileExplorerInlineEditRequest,
  FileExplorerSidebarContextEntry,
  FileExplorerSidebarView,
} from "../../../../../../../headless/folders/index.js";
import {
  collectFolderIds,
  createDraft,
  editableError,
  findCreatedFolderId,
  type InlineDraft,
  isInlineRequest,
  isWorkspaceHandle,
} from "../../utils/inlineEdit/index.js";
import type { SidebarRowKey } from "../../utils/sidebarRow/index.js";

type UseSidebarInlineEditOptions = Readonly<{
  actions: FileExplorerControllerActions;
  requestFocus: (key: SidebarRowKey) => void;
  sidebar: FileExplorerSidebarView | null;
}>;

/**
 * Sidebar create와 rename draft, 제출 직렬화, commit 결과와 오류 표시를 소유한다.
 */
export const useSidebarInlineEdit = ({
  actions,
  requestFocus,
  sidebar,
}: UseSidebarInlineEditOptions) => {
  const [draft, setDraft] = useState<InlineDraft | null>(null);
  const submittingDraft = useRef(false);

  /**
   * Headless 요청으로 draft를 열고 새 Folder의 parent가 보이도록 펼친다.
   */
  const beginDraft = (request: FileExplorerInlineEditRequest): void => {
    submittingDraft.current = false;
    setDraft(createDraft(request));
    if (request.kind === "create" && request.parent !== null && sidebar !== null) {
      const ids = new Set(sidebar.expandedFolderIds);
      ids.add(request.parent.id);
      void actions.execute({
        type: "file-explorer.sidebar.expansion.set",
        expandedFolderIds: [...ids],
      });
    }
  };

  /**
   * Context Menu Action을 실행하고 inline edit 요청이면 입력을 시작한다.
   */
  const executeEntry = (entry: FileExplorerSidebarContextEntry): void => {
    const result = actions.execute(entry.action);
    if (isInlineRequest(result)) beginDraft(result);
  };

  /**
   * 제출 중이 아닐 때 현재 inline draft를 취소한다.
   */
  const cancelDraft = (): void => {
    if (submittingDraft.current) return;
    setDraft(null);
  };

  /**
   * 위치 이동처럼 draft를 무조건 종료해야 하는 intent를 처리한다.
   */
  const discardDraft = (): void => {
    submittingDraft.current = false;
    setDraft(null);
  };

  /**
   * 현재 입력값을 바꾸고 이전 검증 오류를 지운다.
   */
  const changeDraft = (value: string): void => {
    setDraft((current) => (current === null ? null : { ...current, value, error: null }));
  };

  /**
   * Create 또는 rename Action을 한 번 제출하고 Workspace commit 결과를 draft에 반영한다.
   */
  const commitDraft = async (): Promise<void> => {
    if (draft === null || draft.submitting || submittingDraft.current) return;
    submittingDraft.current = true;
    const currentDraft = draft;
    const existingIds = collectFolderIds(sidebar?.items ?? []);
    setDraft({ ...currentDraft, submitting: true, error: null });
    const result = actions.execute(
      currentDraft.kind === "create"
        ? {
            type: "file-explorer.folder.create",
            parent: currentDraft.parent,
            name: currentDraft.value,
          }
        : {
            type: "file-explorer.folder.rename",
            folder: currentDraft.folder,
            name: currentDraft.value,
          },
    );
    if (!isWorkspaceHandle(result)) {
      submittingDraft.current = false;
      setDraft({ ...currentDraft, submitting: false, error: "폴더를 변경할 수 없습니다." });
      return;
    }
    const committed = await result.committed;
    if (committed.status === "committed" || committed.status === "no-op") {
      if (currentDraft.kind === "create") {
        const createdId = findCreatedFolderId(committed, existingIds, currentDraft.parent);
        if (createdId !== null) requestFocus(`folder:${createdId}`);
      }
      setDraft(null);
      return;
    }
    const message = committed.status === "rejected" ? editableError(committed) : null;
    submittingDraft.current = false;
    setDraft({
      ...currentDraft,
      submitting: false,
      error: message ?? "폴더를 변경할 수 없습니다.",
    });
  };

  return {
    cancelDraft,
    changeDraft,
    commitDraft,
    discardDraft,
    draft,
    executeEntry,
  } as const;
};
