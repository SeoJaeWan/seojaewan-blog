import { type CSSProperties, type ReactElement, useRef } from "react";

import {
  ChevronDown16Regular,
  ChevronRight16Regular,
  Desktop16Regular,
  Folder16Filled,
  FolderOpen16Filled,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  FileExplorerController,
  FileExplorerControllerActions,
  FileExplorerLocation,
  FileExplorerSidebarItem,
  FileExplorerSidebarView,
} from "../../../../../headless/folders/index.js";
import { ContextRow } from "./contextRow/index.js";
import { useSidebarInlineEdit } from "./hooks/useSidebarInlineEdit/index.js";
import { useSidebarResize } from "./hooks/useSidebarResize/index.js";
import { useSidebarTreeNavigation } from "./hooks/useSidebarTreeNavigation/index.js";
import { InlineEditor } from "./inlineEditor/index.js";
import { rowKey, sameLocation, type SidebarRow } from "./utils/sidebarRow/index.js";

import "./fileExplorerSidebar.css";

const DEFAULT_MINIMUM_WIDTH = 176;
const DEFAULT_MAXIMUM_WIDTH = 400;

/** File Explorer window root가 Sidebar에 전달하는 제품 계약이다. */
export type FileExplorerSidebarProps = Readonly<{
  /** desktop read model이다. mobile projection의 null은 아무 DOM도 만들지 않는다. */
  sidebar: FileExplorerSidebarView | null;
  /** Sidebar intent를 exact File Explorer controller Action으로 실행한다. */
  actions: FileExplorerControllerActions;
  /** invocation row identity로 headless Context Menu entry를 조회한다. */
  getContextMenu: FileExplorerController["getSidebarContextMenu"];
  /** Context Menu portal을 붙일 문서 내 container다. */
  portalContainer?: HTMLElement | null;
  /** pointer drag가 허용하는 최소 폭이다. */
  minimumWidth?: number;
  /** pointer drag가 허용하는 최대 폭이다. */
  maximumWidth?: number;
  /** 제품 layout에서 Sidebar root에 추가할 className이다. */
  className?: string;
}>;

/**
 * Desktop root와 nested Folder tree, Context Menu, inline mutation, pointer 폭을 렌더링한다.
 */
export const FileExplorerSidebar = ({
  actions,
  className,
  getContextMenu,
  maximumWidth = DEFAULT_MAXIMUM_WIDTH,
  minimumWidth = DEFAULT_MINIMUM_WIDTH,
  portalContainer,
  sidebar,
}: FileExplorerSidebarProps) => {
  const {
    focusedKey,
    focusRow,
    handleTreeKey,
    registerRow,
    requestFocus,
    setExpanded,
    setFocusedKey,
  } = useSidebarTreeNavigation({ actions, sidebar });
  const { cancelDraft, changeDraft, commitDraft, discardDraft, draft, executeEntry } =
    useSidebarInlineEdit({ actions, requestFocus, sidebar });
  const restoringMenuFocusKey = useRef<ReturnType<typeof rowKey> | null>(null);

  /**
   * Inline draft를 닫고 선택한 Sidebar 위치로 이동한다.
   */
  const navigate = (location: FileExplorerLocation): void => {
    discardDraft();
    void actions.execute({ type: "file-explorer.navigation.navigate", location });
  };

  const beginResize = useSidebarResize({
    width: sidebar?.width ?? minimumWidth,
    minimumWidth,
    maximumWidth: Math.max(minimumWidth, maximumWidth),
    onWidthChange: (width) =>
      void actions.execute({ type: "file-explorer.sidebar.width.set", width }),
  });

  if (sidebar === null) return null;

  /**
   * 한 Desktop 또는 Folder 행과 해당 invocation menu를 렌더링한다.
   */
  const renderRow = (row: SidebarRow, depth: number): ReactElement => {
    const key = rowKey(row);
    const location = row.kind === "desktop" ? null : row.ref;
    const menu = getContextMenu(location);
    const editing = draft?.kind === "rename" && sameLocation(draft.folder, location);
    if (editing) {
      return (
        <InlineEditor
          depth={depth}
          draft={draft}
          key={key}
          onCancel={cancelDraft}
          onChange={changeDraft}
          onSubmit={() => void commitDraft()}
        />
      );
    }

    const rowElement = (
      <div
        aria-current={row.current ? "page" : undefined}
        aria-expanded={row.kind === "folder" && row.hasChildren ? row.expanded : undefined}
        aria-level={depth}
        className="file-explorer-sidebar__row"
        data-current={row.current ? "true" : undefined}
        data-kind={row.kind}
        data-row-key={key}
        onClick={() => {
          focusRow(key);
          navigate(location);
        }}
        onFocus={(event) => {
          setFocusedKey(key);
          const restoredFromMenu =
            restoringMenuFocusKey.current === key ||
            (event.relatedTarget instanceof HTMLElement &&
              event.relatedTarget.closest(".file-explorer-sidebar__menu") !== null);
          if (restoringMenuFocusKey.current === key) restoringMenuFocusKey.current = null;
          if (!restoredFromMenu) {
            void actions.execute({ type: "file-explorer.selection.set", selection: [] });
          }
        }}
        onKeyDown={(event) => handleTreeKey(event, row, navigate)}
        ref={registerRow(key)}
        role="treeitem"
        style={{ "--wd-file-explorer-sidebar-depth": depth } as CSSProperties}
        tabIndex={focusedKey === key ? 0 : -1}
      >
        {row.kind === "folder" && row.hasChildren ? (
          <button
            aria-label={row.expanded ? `${row.name} 접기` : `${row.name} 펼치기`}
            className="file-explorer-sidebar__toggle"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(row, !row.expanded);
            }}
            onPointerDown={(event) => event.preventDefault()}
            tabIndex={-1}
            type="button"
          >
            {row.expanded ? (
              <ChevronDown16Regular aria-hidden="true" />
            ) : (
              <ChevronRight16Regular aria-hidden="true" />
            )}
          </button>
        ) : (
          <span aria-hidden="true" className="file-explorer-sidebar__toggle-spacer" />
        )}
        {row.kind === "desktop" ? (
          <Desktop16Regular aria-hidden="true" className="file-explorer-sidebar__icon" />
        ) : row.expanded ? (
          <FolderOpen16Filled aria-hidden="true" className="file-explorer-sidebar__icon" />
        ) : (
          <Folder16Filled aria-hidden="true" className="file-explorer-sidebar__icon" />
        )}
        <span className="file-explorer-sidebar__label">{row.name}</span>
      </div>
    );

    return menu === null ? (
      rowElement
    ) : (
      <ContextRow
        entries={menu.entries}
        key={key}
        onDismiss={() => {
          restoringMenuFocusKey.current = key;
        }}
        onEntry={executeEntry}
        portalContainer={portalContainer}
      >
        {rowElement}
      </ContextRow>
    );
  };

  /**
   * Folder 행과 펼쳐진 하위 branch 및 create editor를 재귀적으로 렌더링한다.
   */
  const renderFolder = (folder: FileExplorerSidebarItem): ReactElement => (
    <div className="file-explorer-sidebar__branch" key={folder.ref.id}>
      {renderRow(folder, folder.depth + 1)}
      {folder.expanded ? (
        <div role="group">
          {draft?.kind === "create" && sameLocation(draft.parent, folder.ref) ? (
            <InlineEditor
              depth={folder.depth + 2}
              draft={draft}
              onCancel={cancelDraft}
              onChange={changeDraft}
              onSubmit={() => void commitDraft()}
            />
          ) : null}
          {folder.children.map(renderFolder)}
        </div>
      ) : null}
    </div>
  );

  return (
    <aside
      aria-label="폴더 사이드바"
      className={clsx("file-explorer-sidebar", className)}
      style={{ inlineSize: sidebar.width }}
    >
      <div aria-label="폴더" className="file-explorer-sidebar__tree" role="tree">
        {renderRow(sidebar.desktop, 1)}
        <div role="group">
          {draft?.kind === "create" && draft.parent === null ? (
            <InlineEditor
              depth={2}
              draft={draft}
              onCancel={cancelDraft}
              onChange={changeDraft}
              onSubmit={() => void commitDraft()}
            />
          ) : null}
          {sidebar.items.map(renderFolder)}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="file-explorer-sidebar__resize-handle"
        data-sidebar-resize-handle=""
        onPointerDown={beginResize}
      />
    </aside>
  );
};
