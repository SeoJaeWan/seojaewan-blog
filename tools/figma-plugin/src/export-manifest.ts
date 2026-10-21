import { sha256Hex, utf8Encode } from './sha256';
import { type JsonObject, stableStringify } from './stable-json';

// 컴포넌트마다 따로 두는 export.json(figma/components/<컴포넌트>/export.json)과 그 폴더의 파일 변경을 계산한다.
// 내보낸 컴포넌트의 폴더만 바꾸므로, 다른 컴포넌트를 내보낸 PR끼리 같은 파일을 건드리지 않는다.

/** 노드 왼쪽 위를 원점으로 한 렌더링 영역. 그림자가 왼쪽·위로 나가면 x·y가 음수다. */
export type RenderBounds = { x: number; y: number; width: number; height: number };

export type VariantEntry = {
  nodeId: string;
  properties: Record<string, string>;
  width: number;
  height: number;
  renderBounds: RenderBounds;
  /** PNG 해시 */
  hash: string;
  /** 값 비교에 쓰는 레이어 정보([[피그마 일치 검사:export.json 계약]]) */
  layers: JsonObject[];
};

/** figma/components/<컴포넌트>/export.json */
export type ComponentManifest = {
  name: string;
  nodeId: string;
  hash: string;
  exportedAt: string;
  variants: Record<string, VariantEntry>;
};

/** figma/figma.json. 바뀌지 않는 전역 값만 둔다 */
export type FigmaSettings = { fileKey: string; scale: number };

/** 이번에 내보낸 컴포넌트 */
export type ExportedComponent = {
  /** 컴포넌트 폴더 이름 */
  slug: string;
  manifest: ComponentManifest;
  /** 이번에 만든 vector SVG 파일 이름 */
  svgFiles: readonly string[];
};

/** 컴포넌트 폴더 하나의 변경 */
export type ComponentChanges = {
  slug: string;
  /** 올릴 PNG 변형 이름 */
  pngUploads: string[];
  /** 올릴 SVG 파일 이름 */
  svgUploads: string[];
  /** 지울 파일 이름(폴더 안) */
  deletions: string[];
  /** export.json을 다시 써야 하면 그 내용, 아니면 null */
  manifestText: string | null;
};

/** 컴포넌트 폴더 안 export.json 이름 */
export const COMPONENT_MANIFEST_FILE = 'export.json';

/**
 * 컴포넌트 해시를 계산한다. 변형마다 PNG 해시와 레이어 정보를 이은 값을 정렬해 이어 붙인 문자열의 SHA-256이다.
 * 이미지가 같아도 레이어 정보가 바뀌면 해시가 바뀐다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param variants 변형마다 PNG 해시와 레이어 정보
 * @returns 컴포넌트 해시
 */
export function componentHash(variants: readonly Pick<VariantEntry, 'hash' | 'layers'>[]): string {
  const parts = variants.map((variant) => `${variant.hash}${stableStringify(variant.layers)}`);
  return sha256Hex(utf8Encode(parts.sort().join('')));
}

/**
 * 내보낸 컴포넌트 폴더 하나에서 바꿀 파일을 고른다.
 * - PNG는 해시가 바뀌었거나 저장소에 없을 때만 올린다.
 * - SVG는 이름이 내용 해시라 저장소에 없을 때만 올린다.
 * - 폴더에 있지만 새 export.json이 가리키지 않는 파일(사라진 변형의 PNG, 더는 쓰지 않는 SVG)은 지운다.
 * - export.json은 내보낸 시각을 뺀 내용이 바뀌었을 때만 다시 쓰고, 그대로면 이전 시각을 둔다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param exported 이번에 내보낸 컴포넌트
 * @param base 커밋할 브랜치의 그 컴포넌트 export.json(없으면 null)
 * @param existingFiles 커밋할 브랜치의 그 컴포넌트 폴더에 있는 파일 이름
 * @returns 폴더 변경
 */
export function planComponentChanges(
  exported: ExportedComponent,
  base: ComponentManifest | null,
  existingFiles: readonly string[],
): ComponentChanges {
  const existing = new Set(existingFiles);
  const { manifest } = exported;
  const pngUploads = Object.entries(manifest.variants)
    .filter(
      ([variant, entry]) =>
        base?.variants[variant]?.hash !== entry.hash || !existing.has(pngFile(variant)),
    )
    .map(([variant]) => variant);
  const svgUploads = [...new Set(exported.svgFiles)].filter((file) => !existing.has(file)).sort();
  const wanted = new Set([
    COMPONENT_MANIFEST_FILE,
    ...Object.keys(manifest.variants).map(pngFile),
    ...referencedSvgFiles(manifest),
  ]);
  const deletions = existingFiles.filter((file) => !wanted.has(file)).sort();
  const isSame =
    base !== null &&
    stableStringify(manifestJson({ ...base, exportedAt: '' })) ===
      stableStringify(manifestJson({ ...manifest, exportedAt: '' }));
  return {
    slug: exported.slug,
    pngUploads,
    svgUploads,
    deletions,
    manifestText: isSame ? null : stableStringify(manifestJson(manifest)),
  };
}

/**
 * 폴더 변경이 하나라도 있는지 확인한다.
 * @param changes 폴더 변경
 * @returns 바뀌면 true
 */
export function hasComponentChange(changes: ComponentChanges): boolean {
  return (
    changes.manifestText !== null ||
    changes.pngUploads.length + changes.svgUploads.length + changes.deletions.length > 0
  );
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
 * export.json이 가리키는 SVG 파일 이름을 모은다.
 * @param manifest 컴포넌트 export.json
 * @returns SVG 파일 이름 집합
 */
export function referencedSvgFiles(manifest: ComponentManifest): Set<string> {
  const files = new Set<string>();
  for (const variant of Object.values(manifest.variants)) {
    for (const layer of variant.layers) {
      const { svg } = layer;
      if (isRecord(svg) && typeof svg.file === 'string') {
        files.add(svg.file);
      }
    }
  }
  return files;
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
      width: value.width,
      height: value.height,
      renderBounds: { ...value.renderBounds },
      hash: value.hash,
      layers: value.layers,
    };
  }
  return {
    name: manifest.name,
    nodeId: manifest.nodeId,
    hash: manifest.hash,
    exportedAt: manifest.exportedAt,
    variants,
  };
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
 * 저장소에 있는 컴포넌트 export.json 문자열을 읽는다. 모양이 맞지 않는 변형은 버린다.
 * @param text export.json 내용
 * @returns 컴포넌트 export.json, 읽을 수 없으면 null
 */
export function parseComponentManifest(text: string): ComponentManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.variants)) {
    return null;
  }
  const variants: Record<string, VariantEntry> = {};
  for (const [variant, raw] of Object.entries(parsed.variants)) {
    if (isRecord(raw) && typeof raw.hash === 'string') {
      variants[variant] = {
        nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : '',
        properties: parseProperties(raw.properties),
        width: typeof raw.width === 'number' ? raw.width : 0,
        height: typeof raw.height === 'number' ? raw.height : 0,
        renderBounds: parseBounds(raw.renderBounds),
        hash: raw.hash,
        layers: Array.isArray(raw.layers) ? raw.layers.filter(isJsonObject) : [],
      };
    }
  }
  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    nodeId: typeof parsed.nodeId === 'string' ? parsed.nodeId : '',
    hash: typeof parsed.hash === 'string' ? parsed.hash : '',
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
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
 * 값이 JSON 객체인지 확인한다.
 * @param value 확인할 값
 * @returns JSON 객체면 true
 */
function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

/**
 * 값이 배열이 아닌 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
