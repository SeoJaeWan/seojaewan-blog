import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import type {
  FileExplorerControllerActions,
  FileExplorerLocation,
  FileExplorerSidebarItem,
  FileExplorerSidebarView,
} from "../../../../../../../headless/folders/index.js";
import {
  locationKey,
  rowKey,
  type SidebarRow,
  type SidebarRowKey,
} from "../../utils/sidebarRow/index.js";

type UseSidebarTreeNavigationOptions = Readonly<{
  actions: FileExplorerControllerActions;
  sidebar: FileExplorerSidebarView | null;
}>;

/**
 * Sidebar tree의 roving focus, 현재 행 노출, 펼침과 키보드 이동을 소유한다.
 */
export const useSidebarTreeNavigation = ({ actions, sidebar }: UseSidebarTreeNavigationOptions) => {
  const initialFocusKey = sidebar?.currentRow
    ? locationKey(sidebar.currentRow.location)
    : "desktop";
  const [focusedKey, setFocusedKey] = useState<SidebarRowKey>(initialFocusKey);
  const [pendingFocusKey, setPendingFocusKey] = useState<SidebarRowKey | null>(null);
  const rowRefs = useRef(new Map<SidebarRowKey, HTMLElement>());
  const previousCurrentKey = useRef<SidebarRowKey | null>(null);
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
    if (pendingFocusKey === null) return;
    const row = rowRefs.current.get(pendingFocusKey);
    if (row === undefined) return;
    setFocusedKey(pendingFocusKey);
    row.focus();
    setPendingFocusKey(null);
  }, [pendingFocusKey, sidebar]);

  /**
   * Folder identity 목록을 갱신해 해당 행을 펼치거나 접는다.
   */
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

  /**
   * 행을 roving focus 대상으로 정하고 현재 DOM이 있으면 즉시 focus한다.
   */
  const focusRow = (key: SidebarRowKey): void => {
    setFocusedKey(key);
    rowRefs.current.get(key)?.focus();
  };

  /**
   * 다음 Sidebar projection에서 나타날 행에 focus를 예약한다.
   */
  const requestFocus = (key: SidebarRowKey): void => {
    setPendingFocusKey(key);
  };

  /**
   * Sidebar 행 DOM을 identity별로 등록한다.
   */
  const registerRow =
    (key: SidebarRowKey) =>
    (element: HTMLElement | null): void => {
      if (element === null) rowRefs.current.delete(key);
      else rowRefs.current.set(key, element);
    };

  /**
   * Tree 방향키와 Enter 입력을 펼침, focus 이동, 위치 이동 intent로 바꾼다.
   */
  const handleTreeKey = (
    event: KeyboardEvent<HTMLElement>,
    row: SidebarRow,
    onNavigate: (location: FileExplorerLocation) => void,
  ): void => {
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
      onNavigate(row.kind === "desktop" ? null : row.ref);
    }
  };

  return {
    focusedKey,
    focusRow,
    handleTreeKey,
    registerRow,
    requestFocus,
    setExpanded,
    setFocusedKey,
  } as const;
};
