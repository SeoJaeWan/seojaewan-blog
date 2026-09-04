import type { Content, ExternalShortcut, Folder, ResourceRef } from "./model.js";
import { assertUniqueResourceIds, type StaticCatalog } from "./staticCatalog.js";

export type ContentCatalogReader = StaticCatalog<Content>;
export type FolderCatalogReader = StaticCatalog<Folder>;
export type ExternalShortcutCatalogReader = StaticCatalog<ExternalShortcut>;

export type ResourceReaders = Readonly<{
  content: ContentCatalogReader;
  folder: FolderCatalogReader;
  externalShortcut: ExternalShortcutCatalogReader;
}>;

export type ResourceLookup = Readonly<{
  hasResource(ref: ResourceRef): boolean;
}>;

export const createResourceLookup = (readers: ResourceReaders): ResourceLookup => {
  const validateGlobalNamespace = () => {
    assertUniqueResourceIds([
      ...readers.content.list(),
      ...readers.folder.list(),
      ...readers.externalShortcut.list(),
    ]);
  };

  validateGlobalNamespace();

  return Object.freeze({
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
