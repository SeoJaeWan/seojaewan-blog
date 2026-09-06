/**
 * @file WorkspaceStore의 Folder 원본을 static Catalog 계약으로 노출한다.
 *
 * Folder mutation과 placement 변경은 이 파일의 책임이 아니다.
 */
import type { Folder, ResourceId } from "../../resources/index.js";
import { WorkspaceStore } from "../workspaceStore/index.js";

/**
 * `WorkspaceStore`가 소유한 현재 Folder 원본을 static Catalog 형태로 읽는다.
 *
 * Folder의 lifecycle과 placement 변경은 소유하지 않으며, mutation은 `WorkspaceStore`를 사용한다.
 */
export class FolderCatalog {
  /** 별도 instance 없이 현재 WorkspaceStore의 Folder 원본만 조회하게 한다. */
  private constructor() {}

  /**
   * 현재 Workspace에 주어진 ID의 Folder가 존재하는지 확인한다.
   *
   * Folder 원본이나 placement는 반환하지 않으며, 원본이 필요하면 `get`을 사용한다.
   */
  static has(id: ResourceId): boolean {
    return WorkspaceStore.getSnapshot().folders.some((folder) => folder.ref.id === id);
  }

  /**
   * 현재 Workspace에서 주어진 ID의 Folder 원본을 읽는다.
   *
   * 일치하는 Folder가 없으면 `undefined`를 반환하며, mutation은 수행하지 않는다.
   */
  static get(id: ResourceId): Folder | undefined {
    return WorkspaceStore.getSnapshot().folders.find((folder) => folder.ref.id === id);
  }

  /**
   * 현재 Workspace가 소유한 모든 Folder 원본을 snapshot 순서로 읽는다.
   *
   * Desktop이나 placement를 합성하지 않으며, 반환 목록의 lifecycle은 `WorkspaceStore`가 소유한다.
   */
  static list(): readonly Folder[] {
    return WorkspaceStore.getSnapshot().folders;
  }
}
