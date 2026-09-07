/**
 * @file Resource 종류, 원본 model과 직렬화 가능한 참조 계약을 정의한다.
 *
 * Catalog 조회와 Workspace 배치는 이 파일의 책임이 아니다.
 */
import { parseResourceId, type ResourceId } from "../resourceId/index.js";

/**
 * 현재 제품이 구분하는 Resource 원본의 종류를 나타낸다.
 *
 * UI 표현과 실행 capability는 포함하지 않으며, Surface별 selector와 Action이
 * 해당 책임을 소유한다.
 */
export type ResourceKind = "content" | "folder" | "external-shortcut";

/**
 * Content 원본을 전역 identity로 참조한다.
 *
 * title, slug와 body는 포함하지 않으며, 원본이 필요하면 Content Catalog reader를 사용한다.
 */
export type ContentResourceRef = Readonly<{
  kind: "content";
  id: ResourceId;
}>;

/**
 * Folder 원본을 전역 identity로 참조한다.
 *
 * name, parent와 Desktop 위치는 포함하지 않으며, 원본과 배치는 각각 Folder Catalog와
 * Workspace가 소유한다.
 */
export type FolderResourceRef = Readonly<{
  kind: "folder";
  id: ResourceId;
}>;

/**
 * ExternalShortcut 원본을 전역 identity로 참조한다.
 *
 * name과 URL은 포함하지 않으며, 원본이 필요하면 ExternalShortcut Catalog reader를 사용한다.
 */
export type ExternalShortcutResourceRef = Readonly<{
  kind: "external-shortcut";
  id: ResourceId;
}>;

/**
 * 모든 Resource 종류를 kind로 구분해 전달하는 public 참조 계약이다.
 *
 * Resource 원본과 UI 표시 데이터를 포함하지 않으며, 존재 확인에는 `ResourceLookup`을 사용한다.
 */
export type ResourceRef = ContentResourceRef | FolderResourceRef | ExternalShortcutResourceRef;

/**
 * 주어진 `ResourceKind`에 대응하는 구체적인 Resource ref type을 선택한다.
 *
 * runtime 검증은 수행하지 않으며, 외부 입력은 `parseResourceRef`로 검증한다.
 */
export type ResourceRefForKind<Kind extends ResourceKind> = Extract<ResourceRef, { kind: Kind }>;

/**
 * Content 목록과 탐색에 필요한 정적 metadata 원본을 나타낸다.
 *
 * body block과 Workspace 배치는 포함하지 않으며, 각각 `ContentDocumentReader`와
 * Workspace가 소유한다.
 */
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

/**
 * JSON으로 안전하게 직렬화할 수 있는 재귀적인 값의 범위를 나타낸다.
 *
 * provider 전용 객체나 실행 가능한 값은 포함하지 않으며, Content body의 중립 payload에 사용한다.
 */
export type SerializableValue =
  | null
  | boolean
  | number
  | string
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

/**
 * Application provider에 결합되지 않은 Content body block 하나를 나타낸다.
 *
 * Notion block type과 rendering 규칙은 포함하지 않으며, 해석은 Application renderer가 소유한다.
 */
export type ContentDocumentBlock = Readonly<Record<string, SerializableValue>>;

/**
 * Content metadata와 지연 조회된 body block을 함께 전달한다.
 *
 * Catalog 목록과 rendering은 소유하지 않으며, 조회는 `ContentDocumentReader`가 담당한다.
 */
export type ContentDocument = Readonly<{
  content: Content;
  blocks: readonly ContentDocumentBlock[];
}>;

/**
 * 사용자가 이름을 바꿀 수 있는 Folder 원본을 나타낸다.
 *
 * parent와 Desktop 위치는 포함하지 않으며, 해당 배치는 Workspace가 소유한다.
 */
export type Folder = Readonly<{
  ref: FolderResourceRef;
  name: string;
}>;

/**
 * 외부 브라우저에서 열리는 shortcut의 최소 정적 원본을 나타낸다.
 *
 * disabled 상태, icon과 정렬 metadata는 포함하지 않으며, 필요한 표현은 Surface selector가 파생한다.
 */
export type ExternalShortcut = Readonly<{
  ref: ExternalShortcutResourceRef;
  name: string;
  url: string;
}>;

const RESOURCE_KINDS: readonly ResourceKind[] = ["content", "folder", "external-shortcut"];

/**
 * 외부 입력이 현재 지원하는 Resource kind인지 판별한다.
 */
const isResourceKind = (value: unknown): value is ResourceKind =>
  RESOURCE_KINDS.some((kind) => kind === value);

/**
 * kind와 UUID 문자열로 검증된 immutable `ResourceRef`를 만들고 runtime에서 얕게 동결한다.
 *
 * `ResourceRef`는 primitive field만 가지므로 전체 참조가 안정되지만, 일반적인 `Object.freeze`가
 * 중첩 객체까지 깊게 동결하는 것은 아니다. Resource 존재 여부와 kind별 원본 일치는 Catalog가 검증한다.
 */
export const createResourceRef = <Kind extends ResourceKind>(
  kind: Kind,
  id: string,
): ResourceRefForKind<Kind> =>
  Object.freeze({ kind, id: parseResourceId(id) }) as ResourceRefForKind<Kind>;

/**
 * 외부 입력을 kind와 id만 가진 immutable `ResourceRef`로 복원한다.
 *
 * Resource 원본의 존재 여부는 확인하지 않으며, 잘못된 구조나 UUID에는 오류를 던진다.
 */
export const parseResourceRef = (value: unknown): ResourceRef => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("ResourceRef는 객체여야 합니다");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("id")) {
    throw new TypeError("ResourceRef에는 kind와 id만 포함되어야 합니다");
  }

  if (!isResourceKind(record.kind) || typeof record.id !== "string") {
    throw new TypeError("ResourceRef에는 지원하는 kind와 UUID id가 필요합니다");
  }

  return createResourceRef(record.kind, record.id);
};
