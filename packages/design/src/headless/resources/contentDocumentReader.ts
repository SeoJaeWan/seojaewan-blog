import type { ContentDocument, ContentResourceRef } from "./model.js";

export type ContentDocumentReader = Readonly<{
  readContentDocument(ref: ContentResourceRef): Promise<ContentDocument | undefined>;
}>;
