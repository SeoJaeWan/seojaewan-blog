/**
 * @file File Explorer tab의 Folder location과 navigation 상태를 정의한다.
 *
 * Folder 원본과 parent tree는 Catalog와 Workspace가 소유한다.
 */
import type { FolderResourceRef, ResourceId, ResourceRef } from "../../resources/index.js";
import type { NavigationState } from "../../windows/navigation/index.js";
import type { FileExplorerTabId } from "../fileExplorerTabId/index.js";

/**
 * File Explorer tab이 탐색하는 Folder 또는 Desktop root를 나타낸다.
 *
 * `null`은 별도 Folder Resource가 아닌 Desktop root다.
 */
export type FileExplorerLocation = FolderResourceRef | null;

/**
 * File Explorer history가 보존하는 정상 위치 또는 주소 해석 실패 상태다.
 *
 * 실패한 주소도 일반 history target이며 제출 문자열을 그대로 보존한다.
 */
export type ExplorerNavigationTarget =
  | Readonly<{ kind: "location"; location: FileExplorerLocation }>
  | Readonly<{ kind: "unresolved-path"; path: string }>;

/**
 * 기존 Window fixture가 직접 location을 제공하는 동안의 읽기 호환 범위다.
 *
 * WindowStore가 만드는 runtime entry는 항상 `ExplorerNavigationTarget`을 사용한다.
 */
export type FileExplorerNavigationValue =
  FileExplorerLocation | (ExplorerNavigationTarget & Readonly<{ id: ResourceId }>);

/**
 * File Explorer Window 안의 독립적인 tab 상태다.
 *
 * Folder metadata와 item 목록은 복제하지 않고 현재 Catalog와 Workspace에서 파생한다.
 */
export type FileExplorerTab = Readonly<{
  id: FileExplorerTabId;
  navigation: NavigationState<FileExplorerNavigationValue>;
  /** 현재 위치의 direct child 표시 이름에 적용할 tab-local 검색어다. */
  query?: string;
  /** Sidebar에서 펼친 Folder identity를 tab마다 독립적으로 보존한다. */
  expandedFolderIds?: readonly ResourceId[];
  /** Content viewport가 선택한 serializable Resource 참조다. */
  selection?: readonly ResourceRef[];
}>;
