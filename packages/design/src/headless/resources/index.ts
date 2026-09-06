/**
 * @file Resource feature의 public 계약과 구현을 한 진입점으로 다시 내보낸다.
 *
 * 새로운 domain 동작을 구현하지 않고 하위 module의 public surface만 조합한다.
 */
export { type ContentDocumentReader } from "./contentDocumentReader/index.js";
export {
  type Content,
  type ContentDocument,
  type ContentDocumentBlock,
  type ContentResourceRef,
  createResourceRef,
  type ExternalShortcut,
  type ExternalShortcutResourceRef,
  type Folder,
  type FolderResourceRef,
  parseResourceRef,
  type ResourceKind,
  type ResourceRef,
  type ResourceRefForKind,
  type SerializableValue,
} from "./model/index.js";
export {
  InvalidResourceIdError,
  isResourceId,
  parseResourceId,
  type ResourceId,
} from "./resourceId/index.js";
export {
  type ContentCatalogReader,
  createResourceLookup,
  type ExternalShortcutCatalogReader,
  type FolderCatalogReader,
  type ResourceLookup,
  type ResourceReaders,
} from "./resourceLookup/index.js";
export {
  assertUniqueResourceIds,
  type CatalogResource,
  createStaticCatalog,
  DuplicateResourceIdError,
  type StaticCatalog,
} from "./staticCatalog/index.js";
