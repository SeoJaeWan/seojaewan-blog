import { sha256Hex, utf8Encode } from './sha256';
import { type JsonObject, type JsonValue, stableStringify } from './stable-json';

// 컴포넌트마다 따로 두는 export.json(figma/components/<컴포넌트>/export.json)과 그 폴더의 파일 변경을 계산한다.
// 내보낸 컴포넌트의 폴더만 바꾸므로, 다른 컴포넌트를 내보낸 PR끼리 같은 파일을 건드리지 않는다.
// 계약은 [[피그마 일치 검사:export.json 계약]]에 있다.

/** BOOLEAN 컴포넌트 속성 하나를 바꾼 경우(D4 a) */
export type CaseEntry = {
  /** 레이어 목록 */
  layers: JsonObject[];
  /** 숨긴 레이어 경로 */
  hidden: string[];
};

export type VariantEntry = {
  nodeId: string;
  /** 변형 속성(피그마 이름 → 값) */
  properties: Record<string, string>;
  /** PNG 해시(PR 댓글용 이미지) */
  hash: string;
  /** 레이어 목록. 첫 항목이 루트다 */
  layers: JsonObject[];
  /** 숨긴 레이어 경로 */
  hidden: string[];
  /** BOOLEAN 속성 하나를 기본값과 반대로 바꾼 경우. 키는 `<prop 이름>=<true|false>` */
  cases: Record<string, CaseEntry>;
};

/** BOOLEAN 컴포넌트 속성 */
export type BooleanProperty = {
  /** 피그마 속성 키(`Show icon#13:0`) */
  key: string;
  defaultValue: boolean;
};

/** figma/components/<컴포넌트>/export.json */
export type ComponentManifest = {
  name: string;
  nodeId: string;
  hash: string;
  /** React prop 이름 → BOOLEAN 컴포넌트 속성 */
  booleans: Record<string, BooleanProperty>;
  variants: Record<string, VariantEntry>;
};

/** figma/figma.json. 바뀌지 않는 전역 값만 둔다 */
export type FigmaSettings = { fileKey: string; scale: number };

/** 이번에 내보낸 컴포넌트 */
export type ExportedComponent = {
  /** 컴포넌트 폴더 이름 */
  slug: string;
  manifest: ComponentManifest;
};

/** 컴포넌트 폴더 하나의 변경 */
export type ComponentChanges = {
  slug: string;
  /** 올릴 PNG 변형 이름 */
  pngUploads: string[];
  /** 지울 파일 이름(폴더 안) */
  deletions: string[];
  /** export.json을 다시 써야 하면 그 내용, 아니면 null */
  manifestText: string | null;
};

/** 컴포넌트 폴더 안 export.json 이름 */
export const COMPONENT_MANIFEST_FILE = 'export.json';

/**
 * 컴포넌트 해시를 계산한다. 변형마다 PNG 해시와 레이어·숨김·경우 정보를 이은 값을 정렬해 이어 붙인 문자열의 SHA-256이다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param variants 변형 항목
 * @returns 컴포넌트 해시
 */
export function componentHash(variants: readonly VariantEntry[]): string {
  const parts = variants.map(
    (variant) =>
      `${variant.hash}${stableStringify({ layers: variant.layers, hidden: variant.hidden, cases: casesJson(variant.cases) })}`,
  );
  return sha256Hex(utf8Encode(parts.sort().join('')));
}

/**
 * 내보낸 컴포넌트 폴더 하나에서 바꿀 파일을 고른다.
 * - PNG는 해시가 바뀌었거나 저장소에 없을 때만 올린다.
 * - 폴더에 있지만 새 export.json이 가리키지 않는 파일은 지운다.
 * - export.json은 내용이 바뀌었을 때만 다시 쓴다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param exported 이번에 내보낸 컴포넌트
 * @param base 커밋할 브랜치의 그 컴포넌트 export.json 내용(없으면 null)
 * @param baseHashes 커밋할 브랜치 export.json의 변형별 PNG 해시
 * @param existingFiles 커밋할 브랜치의 그 컴포넌트 폴더에 있는 파일 이름
 * @returns 폴더 변경
 */
export function planComponentChanges(
  exported: ExportedComponent,
  base: string | null,
  baseHashes: ReadonlyMap<string, string>,
  existingFiles: readonly string[],
): ComponentChanges {
  const existing = new Set(existingFiles);
  const { manifest } = exported;
  const pngUploads = Object.entries(manifest.variants)
    .filter(
      ([variant, entry]) =>
        baseHashes.get(variant) !== entry.hash || !existing.has(pngFile(variant)),
    )
    .map(([variant]) => variant);
  const wanted = new Set([COMPONENT_MANIFEST_FILE, ...Object.keys(manifest.variants).map(pngFile)]);
  const deletions = existingFiles.filter((file) => !wanted.has(file)).sort();
  const text = manifestText(manifest);
  return {
    slug: exported.slug,
    pngUploads,
    deletions,
    manifestText: base === text ? null : text,
  };
}

/**
 * 폴더 변경이 하나라도 있는지 확인한다.
 * @param changes 폴더 변경
 * @returns 바뀌면 true
 */
export function hasComponentChange(changes: ComponentChanges): boolean {
  return changes.manifestText !== null || changes.pngUploads.length + changes.deletions.length > 0;
}

/**
 * 이번에 내보낸 컴포넌트와 nodeId가 같지만 폴더 이름이 다른 컴포넌트(이름이 바뀐 컴포넌트)의 이전 폴더를 찾는다.
 * 그 폴더 이름으로 이번에 함께 내보낸 컴포넌트가 있으면 이름이 바뀐 것이 아니므로 제외한다.
 * @param exported 이번에 내보낸 컴포넌트
 * @param otherNodeIds 커밋할 브랜치에 있는 다른 컴포넌트 폴더 이름 → nodeId
 * @returns 지울 이전 폴더 이름
 */
export function renamedFolders(
  exported: readonly ExportedComponent[],
  otherNodeIds: ReadonlyMap<string, string>,
): string[] {
  const slugs = new Set(exported.map((component) => component.slug));
  const nodeIds = new Set(exported.map((component) => component.manifest.nodeId));
  return [...otherNodeIds]
    .filter(([slug, nodeId]) => !slugs.has(slug) && nodeIds.has(nodeId))
    .map(([slug]) => slug)
    .sort();
}

/**
 * 변형 PNG 파일 이름을 만든다.
 * @param variant 변형 이름
 * @returns `<변형>.png`
 */
export function pngFile(variant: string): string {
  return `${variant}.png`;
}

/**
 * 컴포넌트 export.json 문자열을 만든다.
 * @param manifest 컴포넌트 export.json
 * @returns 키를 정렬한 JSON 문자열
 */
export function manifestText(manifest: ComponentManifest): string {
  return stableStringify(manifestJson(manifest));
}

/**
 * 컴포넌트 export.json을 직렬화할 수 있는 JSON 객체로 바꾼다.
 * @param manifest 컴포넌트 export.json
 * @returns JSON 객체
 */
export function manifestJson(manifest: ComponentManifest): JsonObject {
  const variants: JsonObject = {};
  for (const [variant, value] of Object.entries(manifest.variants)) {
    variants[variant] = {
      nodeId: value.nodeId,
      properties: { ...value.properties },
      hash: value.hash,
      layers: value.layers,
      hidden: value.hidden,
      cases: casesJson(value.cases),
    };
  }
  const booleans: JsonObject = {};
  for (const [prop, value] of Object.entries(manifest.booleans)) {
    booleans[prop] = { key: value.key, defaultValue: value.defaultValue };
  }
  return {
    name: manifest.name,
    nodeId: manifest.nodeId,
    hash: manifest.hash,
    booleans,
    variants,
  };
}

/**
 * 경우 목록을 JSON 객체로 바꾼다.
 * @param cases 경우 목록
 * @returns JSON 객체
 */
function casesJson(cases: Readonly<Record<string, CaseEntry>>): JsonObject {
  const json: JsonObject = {};
  for (const [name, entry] of Object.entries(cases)) {
    json[name] = { layers: entry.layers, hidden: entry.hidden };
  }
  return json;
}

/**
 * figma.json 내용을 만든다.
 * @param settings 파일 키와 배율
 * @returns figma.json 문자열
 */
export function settingsText(settings: FigmaSettings): string {
  return stableStringify({ fileKey: settings.fileKey, scale: settings.scale });
}

/**
 * 저장소에 있는 컴포넌트 export.json에서 변형별 PNG 해시와 nodeId를 읽는다.
 * @param text export.json 내용
 * @returns nodeId와 변형 이름 → PNG 해시, 읽을 수 없으면 null
 */
export function readManifestHashes(
  text: string,
): { nodeId: string; hashes: Map<string, string> } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.variants)) {
    return null;
  }
  const hashes = new Map<string, string>();
  for (const [variant, raw] of Object.entries(parsed.variants)) {
    if (isRecord(raw) && typeof raw.hash === 'string') {
      hashes.set(variant, raw.hash);
    }
  }
  return { nodeId: typeof parsed.nodeId === 'string' ? parsed.nodeId : '', hashes };
}

/**
 * 값이 배열이 아닌 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
