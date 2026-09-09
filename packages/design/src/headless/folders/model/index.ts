/**
 * @file File Explorer tab의 Folder location과 navigation 상태를 정의한다.
 *
 * Folder 원본과 parent tree는 Catalog와 Workspace가 소유한다.
 */
import type { FolderResourceRef } from "../../resources/index.js";
import type { NavigationState } from "../../windows/navigation/index.js";
import type { FileExplorerTabId } from "../fileExplorerTabId/index.js";

/**
 * File Explorer tab이 탐색하는 Folder 또는 Desktop root를 나타낸다.
 *
 * `null`은 별도 Folder Resource가 아닌 Desktop root다.
 */
export type FileExplorerLocation = FolderResourceRef | null;

/**
 * File Explorer Window 안의 독립적인 tab 상태다.
 *
 * Folder metadata와 item 목록은 복제하지 않고 현재 Catalog와 Workspace에서 파생한다.
 */
export type FileExplorerTab = Readonly<{
  id: FileExplorerTabId;
  navigation: NavigationState<FileExplorerLocation>;
}>;
