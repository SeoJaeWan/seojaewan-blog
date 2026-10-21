import { imagePath } from './naming';
import { sha256Hex, utf8Encode } from './sha256';
import type { JsonObject } from './stable-json';

/** 노드 왼쪽 위를 원점으로 한 렌더링 영역. 그림자가 왼쪽·위로 나가면 x·y가 음수다. */
export type RenderBounds = { x: number; y: number; width: number; height: number };

export type VariantEntry = {
  nodeId: string;
  properties: Record<string, string>;
  width: number;
  height: number;
  renderBounds: RenderBounds;
  hash: string;
};

export type ComponentEntry = {
  name: string;
  nodeId: string;
  hash: string;
  variants: Record<string, VariantEntry>;
};

export type ExportManifest = {
  fileKey: string;
  exportedAt: string;
  scale: number;
  components: Record<string, ComponentEntry>;
};

/** 이번 실행에서 내보낸 컴포넌트. slug는 이미지 폴더 이름이다. */
export type ExportedComponent = {
  slug: string;
  entry: ComponentEntry;
};

/** 커밋할 이미지 변경 */
export type ImageChanges = {
  /** 새로 올릴 이미지: 컴포넌트 slug, 변형 slug, 경로 */
  uploads: { component: string; variant: string; path: string }[];
  /** 지울 이미지 경로 */
  deletions: string[];
  /** 이미지가 바뀐 컴포넌트 slug */
  changedComponents: string[];
};

/**
 * 컴포넌트 해시를 계산한다. 변형 해시를 정렬해 이어 붙인 문자열의 SHA-256이다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param variantHashes 변형 PNG 해시 목록
 * @returns 컴포넌트 해시
 */
export function componentHash(variantHashes: readonly string[]): string {
  return sha256Hex(utf8Encode([...variantHashes].sort().join('')));
}

/**
 * 기준 브랜치의 export.json과 비교해 해시가 바뀐 이미지만 올리고, 내보낸 컴포넌트에서 사라진 변형 이미지는 지운다.
 * 이름이 바뀐 컴포넌트(같은 nodeId, 다른 slug)는 이전 폴더의 이미지를 모두 지운다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param base 기준 브랜치의 export.json(없으면 null)
 * @param exported 이번에 내보낸 컴포넌트
 * @returns 올릴 이미지와 지울 이미지
 */
export function planImageChanges(
  base: ExportManifest | null,
  exported: readonly ExportedComponent[],
): ImageChanges {
  const changes: ImageChanges = { uploads: [], deletions: [], changedComponents: [] };
  const baseComponents = base?.components ?? {};

  for (const { slug, entry } of exported) {
    const previous = baseComponents[slug];
    let hasChange = false;
    for (const [variant, variantEntry] of Object.entries(entry.variants)) {
      if (previous?.variants[variant]?.hash !== variantEntry.hash) {
        changes.uploads.push({ component: slug, variant, path: imagePath(slug, variant) });
        hasChange = true;
      }
    }
    for (const variant of Object.keys(previous?.variants ?? {})) {
      if (!(variant in entry.variants)) {
        changes.deletions.push(imagePath(slug, variant));
        hasChange = true;
      }
    }
    for (const [oldSlug, oldEntry] of renamedFrom(baseComponents, slug, entry, exported)) {
      for (const variant of Object.keys(oldEntry.variants)) {
        changes.deletions.push(imagePath(oldSlug, variant));
      }
      hasChange = true;
    }
    if (hasChange) {
      changes.changedComponents.push(slug);
    }
  }
  return changes;
}

/**
 * 기준 export.json에 이번에 내보낸 컴포넌트를 덮어써 새 export.json을 만든다.
 * 이번에 내보내지 않은 컴포넌트는 이전 항목을 그대로 둔다. 이름이 바뀐 컴포넌트의 이전 항목은 없앤다.
 * @param base 기준 브랜치의 export.json(없으면 null)
 * @param exported 이번에 내보낸 컴포넌트
 * @param meta 파일 키, 내보낸 시각, 배율
 * @returns 새 export.json
 */
export function mergeManifest(
  base: ExportManifest | null,
  exported: readonly ExportedComponent[],
  meta: Omit<ExportManifest, 'components'>,
): ExportManifest {
  const baseComponents = base?.components ?? {};
  const renamed = new Set(
    exported.flatMap(({ slug, entry }) =>
      renamedFrom(baseComponents, slug, entry, exported).map(([oldSlug]) => oldSlug),
    ),
  );
  const components: Record<string, ComponentEntry> = Object.fromEntries(
    Object.entries(baseComponents).filter(([slug]) => !renamed.has(slug)),
  );
  for (const { slug, entry } of exported) {
    components[slug] = entry;
  }
  return { ...meta, components };
}

/**
 * export.json을 직렬화할 수 있는 JSON 객체로 바꾼다.
 * @param manifest export.json 내용
 * @returns JSON 객체
 */
export function manifestToJson(manifest: ExportManifest): JsonObject {
  const components: JsonObject = {};
  for (const [slug, entry] of Object.entries(manifest.components)) {
    const variants: JsonObject = {};
    for (const [variant, value] of Object.entries(entry.variants)) {
      variants[variant] = {
        ...value,
        properties: { ...value.properties },
        renderBounds: { ...value.renderBounds },
      };
    }
    components[slug] = { name: entry.name, nodeId: entry.nodeId, hash: entry.hash, variants };
  }
  return {
    fileKey: manifest.fileKey,
    exportedAt: manifest.exportedAt,
    scale: manifest.scale,
    components,
  };
}

/**
 * 저장소에 있는 export.json 문자열을 읽는다. 모양이 맞지 않는 항목은 버린다.
 * @param text export.json 내용
 * @returns export.json, 읽을 수 없으면 null
 */
export function parseManifest(text: string): ExportManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.components)) {
    return null;
  }
  const components: Record<string, ComponentEntry> = {};
  for (const [slug, value] of Object.entries(parsed.components)) {
    const entry = parseComponent(value);
    if (entry !== null) {
      components[slug] = entry;
    }
  }
  return {
    fileKey: typeof parsed.fileKey === 'string' ? parsed.fileKey : '',
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    scale: typeof parsed.scale === 'number' ? parsed.scale : 1,
    components,
  };
}

/**
 * 이번에 내보낸 컴포넌트와 nodeId가 같지만 slug가 다른 기준 항목(이름이 바뀐 컴포넌트)을 찾는다.
 * 그 slug로 이번에 함께 내보낸 컴포넌트가 있으면 이름이 바뀐 것이 아니므로 제외한다.
 * @param baseComponents 기준 export.json의 컴포넌트
 * @param slug 이번 slug
 * @param entry 이번 항목
 * @param exported 이번에 내보낸 컴포넌트 전체
 * @returns 이전 slug와 항목 목록
 */
function renamedFrom(
  baseComponents: Readonly<Record<string, ComponentEntry>>,
  slug: string,
  entry: ComponentEntry,
  exported: readonly ExportedComponent[],
): [string, ComponentEntry][] {
  return Object.entries(baseComponents).filter(
    ([oldSlug, oldEntry]) =>
      oldSlug !== slug &&
      oldEntry.nodeId === entry.nodeId &&
      !exported.some((other) => other.slug === oldSlug),
  );
}

/**
 * export.json의 컴포넌트 항목 하나를 읽는다.
 * @param value 읽을 값
 * @returns 컴포넌트 항목, 모양이 맞지 않으면 null
 */
function parseComponent(value: unknown): ComponentEntry | null {
  if (!isRecord(value) || !isRecord(value.variants)) {
    return null;
  }
  const variants: Record<string, VariantEntry> = {};
  for (const [variant, raw] of Object.entries(value.variants)) {
    if (isRecord(raw) && typeof raw.hash === 'string') {
      variants[variant] = {
        nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : '',
        properties: parseProperties(raw.properties),
        width: typeof raw.width === 'number' ? raw.width : 0,
        height: typeof raw.height === 'number' ? raw.height : 0,
        renderBounds: parseBounds(raw.renderBounds),
        hash: raw.hash,
      };
    }
  }
  return {
    name: typeof value.name === 'string' ? value.name : '',
    nodeId: typeof value.nodeId === 'string' ? value.nodeId : '',
    hash: typeof value.hash === 'string' ? value.hash : '',
    variants,
  };
}

/**
 * 변형 속성 객체를 읽는다.
 * @param value 읽을 값
 * @returns 문자열 값만 남긴 속성
 */
function parseProperties(value: unknown): Record<string, string> {
  const properties: Record<string, string> = {};
  if (isRecord(value)) {
    for (const [key, property] of Object.entries(value)) {
      if (typeof property === 'string') {
        properties[key] = property;
      }
    }
  }
  return properties;
}

/**
 * 렌더링 영역을 읽는다.
 * @param value 읽을 값
 * @returns 렌더링 영역, 없는 값은 0
 */
function parseBounds(value: unknown): RenderBounds {
  const bounds = isRecord(value) ? value : {};
  return {
    x: typeof bounds.x === 'number' ? bounds.x : 0,
    y: typeof bounds.y === 'number' ? bounds.y : 0,
    width: typeof bounds.width === 'number' ? bounds.width : 0,
    height: typeof bounds.height === 'number' ? bounds.height : 0,
  };
}

/**
 * 값이 배열이 아닌 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
