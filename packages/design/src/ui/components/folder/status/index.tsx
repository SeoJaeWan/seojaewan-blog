import { clsx } from "clsx";

import type {
  FileExplorerControllerActions,
  FileExplorerStatusView,
  FolderViewMode,
} from "../../../../headless/folders/index.js";
import { FolderViewControls } from "../view/index.js";

import "./folderStatus.css";

/** desktop status bar의 controlled count와 quick view 입력이다. */
export type FolderStatusProps = Readonly<{
  actions: FileExplorerControllerActions;
  className?: string;
  status: FileExplorerStatusView | null;
  viewMode: FolderViewMode | null;
}>;

/** count, selection과 두 quick view Action을 표시하며 mobile/unresolved status는 숨긴다. */
export const FolderStatus = ({ actions, className, status, viewMode }: FolderStatusProps) => {
  if (status === null || status.itemCount === null) return null;

  const countLabel =
    status.searchResultCount === null
      ? `${status.itemCount}개 항목`
      : `검색 결과 ${status.searchResultCount}개`;
  const selectionLabel =
    status.selectionCount !== null && status.selectionCount > 0
      ? ` · ${status.selectionCount}개 선택됨`
      : "";

  return (
    <footer
      aria-label="폴더 상태"
      className={clsx("folder-status", className)}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.focus();
      }}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          void actions.execute({ type: "file-explorer.selection.set", selection: [] });
        }
      }}
      tabIndex={0}
    >
      <span aria-live="polite" className="folder-status__count">
        {countLabel}
        {selectionLabel}
      </span>
      <FolderViewControls actions={actions} disabled={viewMode === null} viewMode={viewMode} />
    </footer>
  );
};
