import { parseResourceId, type ResourceId } from "./resourceId.js";

export type ResourceKind = "content" | "folder" | "external-shortcut";

export type ContentResourceRef = Readonly<{
  kind: "content";
  id: ResourceId;
}>;

export type FolderResourceRef = Readonly<{
  kind: "folder";
  id: ResourceId;
}>;

export type ExternalShortcutResourceRef = Readonly<{
  kind: "external-shortcut";
  id: ResourceId;
}>;

export type ResourceRef = ContentResourceRef | FolderResourceRef | ExternalShortcutResourceRef;

export type ResourceRefForKind<Kind extends ResourceKind> = Extract<ResourceRef, { kind: Kind }>;

export type Content = Readonly<{
  ref: ContentResourceRef;
  title: string;
  slug: string;
  summary: string;
  date: string;
  tags: readonly string[];
  cover: string | null;
  source: Readonly<{
    kind: "notion";
    pageId: string;
  }>;
}>;

export type SerializableValue =
  | null
  | boolean
  | number
  | string
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

export type ContentDocumentBlock = Readonly<Record<string, SerializableValue>>;

export type ContentDocument = Readonly<{
  content: Content;
  blocks: readonly ContentDocumentBlock[];
}>;

export type Folder = Readonly<{
  ref: FolderResourceRef;
  name: string;
}>;

export type ExternalShortcut = Readonly<{
  ref: ExternalShortcutResourceRef;
  name: string;
  url: string;
}>;

const RESOURCE_KINDS: readonly ResourceKind[] = ["content", "folder", "external-shortcut"];

const isResourceKind = (value: unknown): value is ResourceKind =>
  RESOURCE_KINDS.some((kind) => kind === value);

export const createResourceRef = <Kind extends ResourceKind>(
  kind: Kind,
  id: string,
): ResourceRefForKind<Kind> =>
  Object.freeze({ kind, id: parseResourceId(id) }) as ResourceRefForKind<Kind>;

export const parseResourceRef = (value: unknown): ResourceRef => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("ResourceRef must be an object");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("id")) {
    throw new TypeError("ResourceRef must contain only kind and id");
  }

  if (!isResourceKind(record.kind) || typeof record.id !== "string") {
    throw new TypeError("ResourceRef must contain a supported kind and UUID id");
  }

  return createResourceRef(record.kind, record.id);
};
