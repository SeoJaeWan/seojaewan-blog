import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ContextMenu } from "@base-ui/react/context-menu";
import {
  ChevronDown16Regular,
  ChevronRight16Regular,
  Desktop16Regular,
  Folder16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  FileExplorerController,
  FileExplorerControllerActions,
  FileExplorerExecution,
  FileExplorerInlineEditRequest,
  FileExplorerLocation,
  FileExplorerSidebarContextEntry,
  FileExplorerSidebarItem,
  FileExplorerSidebarView,
} from "../../../../../headless/folders/index.js";
import type { ResourceId } from "../../../../../headless/resources/index.js";
import type {
  WorkspaceCommittedResult,
  WorkspaceOperationHandle,
} from "../../../../../headless/workspace/index.js";
import { useSidebarResize } from "./hooks/useSidebarResize/index.js";

import "./fileExplorerSidebar.css";

const DEFAULT_MINIMUM_WIDTH = 176;
const DEFAULT_MAXIMUM_WIDTH = 400;

type SidebarRow = FileExplorerSidebarView["desktop"] | FileExplorerSidebarItem;
type SidebarRowKey = "desktop" | `folder:${string}`;

type InlineDraft =
  | Readonly<{
      kind: "create";
      parent: FileExplorerLocation;
      value: string;
      error: string | null;
      submitting: boolean;
    }>
  | Readonly<{
      kind: "rename";
      folder: Exclude<FileExplorerLocation, null>;
      value: string;
      error: string | null;
      submitting: boolean;
    }>;

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

const rowKey = (row: SidebarRow): SidebarRowKey =>
  row.kind === "desktop" ? "desktop" : `folder:${row.ref.id}`;

const locationKey = (location: FileExplorerLocation): SidebarRowKey =>
  location === null ? "desktop" : `folder:${location.id}`;

const sameLocation = (left: FileExplorerLocation, right: FileExplorerLocation): boolean =>
  left === null ? right === null : right !== null && left.id === right.id;

/** collapsed descendant를 포함한 현재 Sidebar Folder identity를 수집한다. */
const collectFolderIds = (
  items: readonly FileExplorerSidebarItem[],
  target = new Set<ResourceId>(),
): ReadonlySet<ResourceId> => {
  for (const item of items) {
    target.add(item.ref.id);
    collectFolderIds(item.children, target);
  }
  return target;
};

const isInlineRequest = (value: FileExplorerExecution): value is FileExplorerInlineEditRequest =>
  "status" in value && value.status === "inline-edit-request";

const isWorkspaceHandle = (value: FileExplorerExecution): value is WorkspaceOperationHandle =>
  "committed" in value;

const editableError = (result: WorkspaceCommittedResult): string | null => {
  if (result.status !== "rejected") return null;
  if (!result.result.ok) {
    switch (result.result.reason) {
      case "folder-name-empty":
        return "폴더 이름을 입력하세요.";
      case "folder-name-too-long":
        return "폴더 이름은 255자 이하여야 합니다.";
      case "folder-name-invalid-character":
        return "폴더 이름에 사용할 수 없는 문자가 있습니다.";
      case "folder-name-relative-segment":
      case "folder-name-reserved":
        return "이 폴더 이름은 사용할 수 없습니다.";
      case "folder-name-trailing-space-or-period":
        return "폴더 이름은 공백이나 마침표로 끝날 수 없습니다.";
      case "folder-name-conflict":
        return "같은 위치에 같은 이름의 폴더가 있습니다.";
      default:
        return "폴더를 변경할 수 없습니다.";
    }
  }
  return "폴더를 변경할 수 없습니다.";
};

/** headless create/rename request를 수정 가능한 local draft로 바꾼다. */
const createDraft = (request: FileExplorerInlineEditRequest): InlineDraft =>
  request.kind === "create"
    ? {
        kind: "create",
        parent: request.parent,
        value: request.initialName,
        error: null,
        submitting: false,
      }
    : {
        kind: "rename",
        folder: request.folder,
        value: request.initialName,
        error: null,
        submitting: false,
      };

type InlineEditorProps = Readonly<{
  draft: InlineDraft;
  depth: number;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
}>;

/** create와 rename에 같은 full-select, commit, cancel, 오류 DOM을 제공한다. */
const InlineEditor = ({ draft, depth, onCancel, onChange, onSubmit }: InlineEditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    if (draft.error !== null) inputRef.current?.focus();
  }, [draft.error]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!draft.submitting) onSubmit();
  };

  return (
    <form
      className="file-explorer-sidebar__editor"
      data-inline-edit={draft.kind}
      onBlur={(event) => {
        if (!draft.submitting && !event.currentTarget.contains(event.relatedTarget)) onCancel();
      }}
      onSubmit={submit}
      style={{ "--wd-file-explorer-sidebar-depth": depth } as React.CSSProperties}
    >
      <span aria-hidden="true" className="file-explorer-sidebar__editor-spacer" />
      <Folder16Regular aria-hidden="true" className="file-explorer-sidebar__icon" />
      <input
        aria-label={draft.kind === "create" ? "새 폴더 이름" : "폴더 이름 바꾸기"}
        aria-invalid={draft.error === null ? undefined : true}
        className="file-explorer-sidebar__input"
        aria-disabled={draft.submitting ? true : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            if (!draft.submitting) onSubmit();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
        ref={inputRef}
        readOnly={draft.submitting}
        value={draft.value}
      />
      {draft.error === null ? null : (
        <span className="file-explorer-sidebar__error" role="alert">
          {draft.error}
        </span>
      )}
    </form>
  );
};

type ContextRowProps = Readonly<{
  children: ReactElement;
  entries: readonly FileExplorerSidebarContextEntry[];
  onEntry: (entry: FileExplorerSidebarContextEntry) => void;
  portalContainer?: HTMLElement | null;
}>;

/** invocation row와 그 row의 Sidebar 전용 Base UI Context Menu를 직접 조합한다. */
const ContextRow = ({ children, entries, onEntry, portalContainer }: ContextRowProps) => (
  <ContextMenu.Root>
    <ContextMenu.Trigger render={children} />
    <ContextMenu.Portal container={portalContainer}>
      <ContextMenu.Positioner className="file-explorer-sidebar__menu-positioner">
        <ContextMenu.Popup aria-label="사이드바 메뉴" className="file-explorer-sidebar__menu">
          {entries.map((entry) => (
            <ContextMenu.Item
              className="file-explorer-sidebar__menu-item"
              key={entry.id}
              onClick={() => onEntry(entry)}
            >
              {entry.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  </ContextMenu.Root>
);

/**
 * Desktop root와 nested Folder tree, Sidebar Context Menu, inline mutation과 pointer 폭을 렌더링한다.
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
  const initialFocusKey = sidebar?.currentRow
    ? locationKey(sidebar.currentRow.location)
    : "desktop";
  const [focusedKey, setFocusedKey] = useState<SidebarRowKey>(initialFocusKey);
  const [draft, setDraft] = useState<InlineDraft | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<ResourceId | null>(null);
  const rowRefs = useRef(new Map<SidebarRowKey, HTMLElement>());
  const previousCurrentKey = useRef<SidebarRowKey | null>(null);
  const submittingDraft = useRef(false);

  const visibleKeys = useMemo(
    () => new Set(sidebar?.visibleRows.map((row) => rowKey(row)) ?? []),
    [sidebar?.visibleRows],
  );

  useEffect(() => {
    if (sidebar === null || visibleKeys.has(focusedKey)) return;
    setFocusedKey(sidebar.currentRow ? locationKey(sidebar.currentRow.location) : "desktop");
  }, [focusedKey, sidebar, visibleKeys]);

  useEffect(() => {
    if (sidebar === null || sidebar.currentRow === null) return;
    const currentKey = locationKey(sidebar.currentRow.location);
    if (previousCurrentKey.current !== currentKey) {
      rowRefs.current.get(currentKey)?.scrollIntoView?.({ block: "nearest" });
      previousCurrentKey.current = currentKey;
    }
  }, [sidebar]);

  useEffect(() => {
    if (pendingFocusId === null) return;
    const key = `folder:${pendingFocusId}` as const;
    const row = rowRefs.current.get(key);
    if (row === undefined) return;
    setFocusedKey(key);
    row.focus();
    setPendingFocusId(null);
  }, [pendingFocusId, sidebar]);

  const setExpanded = (folder: FileExplorerSidebarItem, expanded: boolean): void => {
    if (sidebar === null) return;
    const ids = new Set(sidebar.expandedFolderIds);
    if (expanded) ids.add(folder.ref.id);
    else ids.delete(folder.ref.id);
    void actions.execute({
      type: "file-explorer.sidebar.expansion.set",
      expandedFolderIds: [...ids],
    });
  };

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

  const executeEntry = (entry: FileExplorerSidebarContextEntry): void => {
    const result = actions.execute(entry.action);
    if (isInlineRequest(result)) beginDraft(result);
  };

  const navigate = (location: FileExplorerLocation): void => {
    submittingDraft.current = false;
    setDraft(null);
    void actions.execute({ type: "file-explorer.navigation.navigate", location });
  };

  const cancelDraft = (): void => {
    if (submittingDraft.current) return;
    setDraft(null);
  };

  const focusRow = (key: SidebarRowKey): void => {
    setFocusedKey(key);
    rowRefs.current.get(key)?.focus();
  };

  const handleTreeKey = (event: KeyboardEvent<HTMLElement>, row: SidebarRow): void => {
    if (sidebar === null) return;
    const key = rowKey(row);
    const index = sidebar.visibleRows.findIndex((candidate) => rowKey(candidate) === key);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      const next = sidebar.visibleRows[index + offset];
      if (next !== undefined) focusRow(rowKey(next));
      return;
    }
    if (row.kind === "folder" && event.key === "ArrowRight") {
      event.preventDefault();
      if (row.hasChildren && !row.expanded) setExpanded(row, true);
      return;
    }
    if (row.kind === "folder" && event.key === "ArrowLeft") {
      event.preventDefault();
      if (row.hasChildren && row.expanded) setExpanded(row, false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(row.kind === "desktop" ? null : row.ref);
    }
  };

  const commitDraft = async (): Promise<void> => {
    if (draft === null || draft.submitting || submittingDraft.current) return;
    submittingDraft.current = true;
    const currentDraft = draft;
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
      if (currentDraft.kind === "create" && committed.status === "committed") {
        const existingIds = collectFolderIds(sidebar?.items ?? []);
        const createdPlacement = committed.value.placements.find(
          ({ parent, resource }) =>
            resource.kind === "folder" &&
            !existingIds.has(resource.id) &&
            sameLocation(parent, currentDraft.parent),
        );
        if (createdPlacement?.resource.kind === "folder") {
          setPendingFocusId(createdPlacement.resource.id);
        }
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

  const beginResize = useSidebarResize({
    width: sidebar?.width ?? minimumWidth,
    minimumWidth,
    maximumWidth: Math.max(minimumWidth, maximumWidth),
    onWidthChange: (width) =>
      void actions.execute({ type: "file-explorer.sidebar.width.set", width }),
  });

  if (sidebar === null) return null;

  const registerRow = (key: SidebarRowKey) => (element: HTMLElement | null): void => {
    if (element === null) rowRefs.current.delete(key);
    else rowRefs.current.set(key, element);
  };

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
          onChange={(value) => setDraft({ ...draft, value, error: null })}
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
        data-row-key={key}
        onClick={() => {
          focusRow(key);
          navigate(location);
        }}
        onFocus={() => {
          setFocusedKey(key);
          void actions.execute({ type: "file-explorer.selection.set", selection: [] });
        }}
        onKeyDown={(event) => handleTreeKey(event, row)}
        ref={registerRow(key)}
        role="treeitem"
        style={{ "--wd-file-explorer-sidebar-depth": depth } as React.CSSProperties}
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
        ) : (
          <Folder16Regular aria-hidden="true" className="file-explorer-sidebar__icon" />
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
        onEntry={executeEntry}
        portalContainer={portalContainer}
      >
        {rowElement}
      </ContextRow>
    );
  };

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
              onChange={(value) => setDraft({ ...draft, value, error: null })}
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
              onChange={(value) => setDraft({ ...draft, value, error: null })}
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
