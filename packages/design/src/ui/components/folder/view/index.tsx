import { Button } from "@base-ui/react/button";
import { Grid20Regular, TableSimple20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  FileExplorerControllerActions,
  FolderViewMode,
} from "../../../../headless/folders/index.js";

import "./folderViewControls.css";

/** status quick view의 controlled 제품 입력이다. */
export type FolderViewControlsProps = Readonly<{
  actions: FileExplorerControllerActions;
  className?: string;
  disabled?: boolean;
  viewMode: FolderViewMode | null;
}>;

/** 자세히와 보통 아이콘 view를 controller Action으로 즉시 전환하는 제품 controls다. */
export const FolderViewControls = ({
  actions,
  className,
  disabled = false,
  viewMode,
}: FolderViewControlsProps) => (
  <div aria-label="보기 방식" className={clsx("folder-view-controls", className)} role="group">
    <Button
      aria-label="자세히"
      aria-pressed={viewMode === "details"}
      className="folder-view-controls__button"
      disabled={disabled}
      onClick={() => {
        void actions.execute({
          type: "file-explorer.view.update",
          change: { viewMode: "details" },
        });
      }}
      type="button"
    >
      <TableSimple20Regular aria-hidden="true" />
    </Button>
    <Button
      aria-label="보통 아이콘"
      aria-pressed={viewMode === "medium-icons"}
      className="folder-view-controls__button"
      disabled={disabled}
      onClick={() => {
        void actions.execute({
          type: "file-explorer.view.update",
          change: { viewMode: "medium-icons" },
        });
      }}
      type="button"
    >
      <Grid20Regular aria-hidden="true" />
    </Button>
  </div>
);
