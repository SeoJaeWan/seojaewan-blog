/**
 * @file 종류별 Catalog를 전역 Resource 존재 확인 계약으로 조합한다.
 *
 * Resource 원본 반환과 Catalog lifecycle은 이 파일의 책임이 아니다.
 */
import type { Content, ExternalShortcut, Folder, ResourceRef } from "../model/index.js";
import { assertUniqueResourceIds, type StaticCatalog } from "../staticCatalog/index.js";

/**
 * Content 원본을 static `has`, `get`, `list`로 읽는 Catalog 계약이다.
 *
 * concrete entries와 Content body 조회는 소유하지 않으며, Application Catalog와
 * `ContentDocumentReader`가 각각 담당한다.
 */
export type ContentCatalogReader = StaticCatalog<Content>;

/**
 * Folder 원본을 static `has`, `get`, `list`로 읽는 Catalog 계약이다.
 *
 * Folder parent와 placement는 포함하지 않으며, 해당 상태는 Workspace가 소유한다.
 */
export type FolderCatalogReader = StaticCatalog<Folder>;

/**
 * ExternalShortcut 원본을 static `has`, `get`, `list`로 읽는 Catalog 계약이다.
 *
 * 외부 navigation 실행과 Surface 표현은 포함하지 않으며, Application adapter와 selector가 담당한다.
 */
export type ExternalShortcutCatalogReader = StaticCatalog<ExternalShortcut>;

/**
 * `ResourceLookup`이 종류별 존재 여부를 위임할 Catalog reader 집합이다.
 *
 * entries 생성과 lifecycle은 소유하지 않으며, Application composition root가 구현을 제공한다.
 */
export type ResourceReaders = Readonly<{
  content: ContentCatalogReader;
  folder: FolderCatalogReader;
  externalShortcut: ExternalShortcutCatalogReader;
}>;

/**
 * `ResourceRef`에 해당하는 원본의 존재 여부만 boolean으로 확인한다.
 *
 * Resource 원본이나 표시용 descriptor는 반환하지 않으며, 원본 조회에는 kind별 Catalog를 사용한다.
 */
export type ResourceLookup = Readonly<{
  /**
   * kind와 ID에 해당하는 원본의 존재 여부를 확인한다.
   *
   * 배치 여부는 확인하지 않으며 원본 조회에는 종류별 Catalog를 사용한다.
   */
  hasResource(ref: ResourceRef): boolean;
}>;

/**
 * 종류별 Catalog reader를 하나의 boolean `ResourceLookup`으로 조합한다.
 *
 * Resource 원본 조회와 Application data 등록은 소유하지 않으며, 입력 Catalog의 public 계약만 사용한다.
 */
export const createResourceLookup = (readers: ResourceReaders): ResourceLookup => {
  /**
   * 모든 reader의 현재 목록을 모아 kind를 가로지르는 ID 중복을 검증한다.
   *
   * 생성 시와 매 조회 시 실행되므로 Folder reader도 이 시점에 읽을 수 있어야 한다.
   */
  const validateGlobalNamespace = () => {
    assertUniqueResourceIds([
      ...readers.content.list(),
      ...readers.folder.list(),
      ...readers.externalShortcut.list(),
    ]);
  };

  validateGlobalNamespace();

  return Object.freeze({
    /**
     * 전역 ID 중복을 검사한 뒤 ref의 kind에 해당하는 reader에 존재 확인을 위임한다.
     *
     * 원본을 반환하지 않으며, 중복 또는 reader 오류는 호출자에게 전파한다.
     */
    hasResource(ref: ResourceRef): boolean {
      validateGlobalNamespace();

      switch (ref.kind) {
        case "content":
          return readers.content.has(ref.id);
        case "folder":
          return readers.folder.has(ref.id);
        case "external-shortcut":
          return readers.externalShortcut.has(ref.id);
      }
    },
  });
};
