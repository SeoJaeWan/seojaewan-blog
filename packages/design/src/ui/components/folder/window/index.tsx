/**
 * @file File Explorer controller snapshot을 Common Window와 제품 part로 한 번 조합한다.
 */
import { type ReactNode, useState } from "react";

import { clsx } from "clsx";

import { useFileExplorerController } from "../../../../headless/folders/index.js";
import { WindowRoot, type WindowRootProps } from "../../common/window/index.js";
import { FolderContent } from "../content/index.js";
import {
  type FolderContentFocusTarget,
  FolderNavigation,
} from "../navigation/index.js";
import { FolderSearch } from "../search/index.js";
import { FileExplorerSidebar } from "../sidebar/index.js";
import { FolderStatus } from "../status/index.js";
import { FolderTabs } from "../tabs/index.js";

import "./fileExplorerWindow.css";

/** production File Explorer가 받는 Window identity, frame 설정과 #34 Content slot이다. */
export type FileExplorerWindowProps = Omit<
  WindowRootProps,
  "children" | "titleBarContent"
> &
  Readonly<{
    /** Folder Content item rendering은 후속 제품 owner가 이 slot으로 제공한다. */
    children?: ReactNode;
  }>;

/**
 * File Explorer read model을 한 번 읽어 desktop/mobile chrome과 Common Window frame을 조합한다.
 */
export const FileExplorerWindow = ({
  "aria-label": ariaLabel = "파일 탐색기 창",
  children,
  className,
  sessionId,
  ...windowProps
}: FileExplorerWindowProps) => {
  const controller = useFileExplorerController(sessionId);
  const [contentFocusTarget, setContentFocusTarget] =
    useState<FolderContentFocusTarget | null>(null);

  if (controller.viewModel.status !== "ready") return null;

  const snapshot = controller.viewModel.snapshot;
  const desktop = snapshot.mode === "desktop";
  const tabs = snapshot.tabs?.map((tab) =>
    tab.target.kind === "unresolved-path"
      ? Object.freeze({ ...tab, title: "폴더를 찾을 수 없음" })
      : tab,
  );

  return (
    <WindowRoot
      {...windowProps}
      aria-label={ariaLabel}
      className={clsx("file-explorer-window", className)}
      sessionId={sessionId}
      titleBarContent={
        desktop ? (
          <FolderTabs
            actions={controller.actions}
            activeTabId={snapshot.activeTabId}
            tabs={tabs ?? null}
          />
        ) : (
          <span className="file-explorer-window__mobile-title" title={snapshot.address}>
            {snapshot.error === null ? snapshot.title : "폴더를 찾을 수 없음"}
          </span>
        )
      }
    >
      <div className="file-explorer-window__surface" data-mode={snapshot.mode}>
        <div className="file-explorer-window__navigation-stack">
          <FolderNavigation
            actions={controller.actions}
            address={snapshot.address}
            breadcrumb={snapshot.breadcrumb}
            canGoBack={snapshot.canGoBack}
            canGoForward={snapshot.canGoForward}
            contentFocusTarget={contentFocusTarget}
            error={snapshot.error}
          />
          <FolderSearch
            actions={controller.actions}
            className="file-explorer-window__search"
            disabled={snapshot.error !== null}
            query={snapshot.query}
          />
        </div>
        <div className="file-explorer-window__body">
          <FileExplorerSidebar
            actions={controller.actions}
            getContextMenu={controller.getSidebarContextMenu}
            sidebar={snapshot.sidebar}
          />
          <FolderContent
            actions={controller.actions}
            empty={snapshot.empty}
            error={snapshot.error}
            registerFocusTarget={setContentFocusTarget}
          >
            {children}
          </FolderContent>
        </div>
        <FolderStatus
          actions={controller.actions}
          status={snapshot.status}
          viewMode={snapshot.viewSettings?.viewMode ?? null}
        />
      </div>
    </WindowRoot>
  );
};
