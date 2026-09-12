import type {
  FileExplorerLocation,
  FileExplorerSidebarItem,
  FileExplorerSidebarView,
} from "../../../../../../../headless/folders/index.js";

/**
 * Sidebar tree에 표시되는 Desktop 또는 Folder 행이다.
 */
export type SidebarRow = FileExplorerSidebarView["desktop"] | FileExplorerSidebarItem;

/**
 * Sidebar DOM 참조와 roving focus에 사용하는 안정적인 행 identity다.
 */
export type SidebarRowKey = "desktop" | `folder:${string}`;

/**
 * Sidebar 행을 DOM과 focus state에서 사용할 key로 변환한다.
 */
export const rowKey = (row: SidebarRow): SidebarRowKey =>
  row.kind === "desktop" ? "desktop" : `folder:${row.ref.id}`;

/**
 * File Explorer 위치를 대응하는 Sidebar 행 key로 변환한다.
 */
export const locationKey = (location: FileExplorerLocation): SidebarRowKey =>
  location === null ? "desktop" : `folder:${location.id}`;

/**
 * Desktop 또는 Folder 위치가 같은 resource를 가리키는지 비교한다.
 */
export const sameLocation = (left: FileExplorerLocation, right: FileExplorerLocation): boolean =>
  left === null ? right === null : right !== null && left.id === right.id;
