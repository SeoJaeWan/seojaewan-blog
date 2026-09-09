/**
 * @file 저장 가능한 Workspace 배치와 Folder snapshot 계약을 정의한다.
 *
 * Window session과 Resource 원본 metadata는 이 파일의 책임이 아니다.
 */
import type { Folder, FolderResourceRef, ResourceRef } from "../../resources/index.js";

/**
 * 하나의 Resource가 Desktop 또는 Folder tree에서 차지하는 위치를 나타낸다.
 *
 * Resource 원본 metadata는 포함하지 않으며, `parent: null`은 별도 Resource가 아닌 Desktop root다.
 */
export type ResourcePlacement = Readonly<{
  resource: ResourceRef;
  parent: FolderResourceRef | null;
}>;

/**
 * 저장 가능한 Workspace Folder 원본과 Resource 배치의 전체 snapshot을 나타낸다.
 *
 * WindowSession, tab과 history는 포함하지 않으며, runtime window 상태는 별도 feature가 소유한다.
 */
export type WorkspaceState = Readonly<{
  schemaVersion: 1;
  contentInbox: FolderResourceRef;
  folders: readonly Folder[];
  placements: readonly ResourcePlacement[];
}>;
