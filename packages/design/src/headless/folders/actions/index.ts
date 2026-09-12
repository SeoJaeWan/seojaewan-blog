/**
 * @file File Explorer 제품 입력을 serializable controller Action으로 정의한다.
 *
 * 실제 Store 명령 실행과 현재 Session·tab target 결합은 controller가 소유한다.
 */
import type { FolderResourceRef, ResourceId, ResourceRef } from "../../resources/index.js";
import type { FileExplorerTabId } from "../fileExplorerTabId/index.js";
import type { FileExplorerLocation } from "../model/index.js";
import type { FolderViewSettingsChange } from "../viewSettings/index.js";

/** File Explorer 제품 root가 하나의 실행 진입점에 전달하는 사용자 intent다. */
export type FileExplorerAction =
  /** 현재 Window 끝에 Desktop 위치의 새 tab을 추가한다. */
  | Readonly<{ type: "file-explorer.tab.add" }>
  /** 지정 tab을 현재 Window의 active tab으로 바꾼다. */
  | Readonly<{ type: "file-explorer.tab.activate"; tabId: FileExplorerTabId }>
  /** 지정 tab을 닫고 마지막 tab이면 Window를 닫는다. */
  | Readonly<{ type: "file-explorer.tab.close"; tabId: FileExplorerTabId }>
  /** 현재 tab을 정상 Desktop 또는 Folder 위치로 이동한다. */
  | Readonly<{ type: "file-explorer.navigation.navigate"; location: FileExplorerLocation }>
  /** 주소 문자열을 현재 Workspace에서 해석해 정상 또는 unresolved target으로 이동한다. */
  | Readonly<{ type: "file-explorer.navigation.submit-address"; path: string }>
  /** 현재 tab history에서 뒤로 이동한다. */
  | Readonly<{ type: "file-explorer.navigation.back" }>
  /** 현재 tab history에서 앞으로 이동한다. */
  | Readonly<{ type: "file-explorer.navigation.forward" }>
  /** 현재 위치를 history 추가 없이 새로 투영하고 query·selection·scroll을 초기화한다. */
  | Readonly<{ type: "file-explorer.navigation.refresh" }>
  /** IME 확정 뒤의 tab-local 검색어를 즉시 반영한다. */
  | Readonly<{ type: "file-explorer.query.set"; query: string }>
  /** 현재 tab의 Sidebar Folder expansion identity를 교체한다. */
  | Readonly<{
      type: "file-explorer.sidebar.expansion.set";
      expandedFolderIds: readonly ResourceId[];
    }>
  /** 현재 Window의 Sidebar 폭을 교체한다. */
  | Readonly<{ type: "file-explorer.sidebar.width.set"; width: number }>
  /** #34 Content viewport가 소유한 현재 Resource selection을 교체한다. */
  | Readonly<{ type: "file-explorer.selection.set"; selection: readonly ResourceRef[] }>
  /** 현재 정상 location의 공유 보기·정렬 설정을 갱신한다. */
  | Readonly<{ type: "file-explorer.view.update"; change: FolderViewSettingsChange }>
  /** Sidebar Context Menu에서 inline create draft를 시작한다. */
  | Readonly<{
      type: "file-explorer.folder.create.begin";
      parent: FolderResourceRef | null;
      suggestedName: string;
    }>
  /** inline create 확정값으로 Workspace에 Folder를 만든다. */
  | Readonly<{
      type: "file-explorer.folder.create";
      parent: FolderResourceRef | null;
      name: string;
    }>
  /** Sidebar Context Menu에서 기존 Folder 이름의 inline rename draft를 시작한다. */
  | Readonly<{
      type: "file-explorer.folder.rename.begin";
      folder: FolderResourceRef;
      currentName: string;
    }>
  /** inline rename 확정값으로 Workspace Folder 이름을 바꾼다. */
  | Readonly<{
      type: "file-explorer.folder.rename";
      folder: FolderResourceRef;
      name: string;
    }>
  /** Desktop 또는 Folder 위치를 첫 tab으로 가진 새 File Explorer Window를 만든다. */
  | Readonly<{ type: "file-explorer.window.open"; location: FileExplorerLocation }>
  /** Folder Resource를 Start 목록에 추가한다. */
  | Readonly<{ type: "file-explorer.start.pin"; resource: FolderResourceRef }>
  /** Folder Resource를 Start 목록에서 제거한다. */
  | Readonly<{ type: "file-explorer.start.unpin"; resource: FolderResourceRef }>;
