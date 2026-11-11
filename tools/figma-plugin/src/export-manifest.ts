import type { PatternReport } from './core/pattern-report';
import { type JsonObject, type JsonValue, stableStringify } from './stable-json';

// 대상(컴포넌트나 조립) 폴더마다 두는 export.json과 figma.json을 만들고 읽는다.
// export.json은 이름, 변형 이름, 변형 속성, PNG 안 노드 위치와 구현 참고용 레이어 트리를 담는다.
// 레이어 트리는 판정에 쓰지 않는다.
// 계약은 [[피그마 연동:스토리 규칙]], [[피그마 연동:피그마 플러그인]]에 있다.

/** 변형 PNG 안에서 변형 노드가 놓인 자리(배율 1의 px) */
export type NodeBox = { x: number; y: number; width: number; height: number };

/**
 * export.json의 변형 하나.
 * - nodeId: 변형 노드 ID
 * - properties: 변형 속성(피그마 속성 이름 → 값). 단독 컴포넌트는 비어 있다
 * - node: PNG 안 노드 위치. PNG에는 그림자와 노드 밖으로 나온 자식까지 담긴다
 * - tree: 구현 참고용 레이어 트리. 판정에 쓰지 않는다
 * - report: 조립 보고(조립만). 막지 않고 보고만 한다
 */
export type VariantEntry = {
  nodeId: string;
  properties: Record<string, string>;
  node: NodeBox;
  tree?: JsonObject;
  report?: PatternReport;
};

/** 피그마 노드의 사각형(절대 좌표) */
type Bounds = { x: number; y: number; width: number; height: number };

/**
 * 변형 PNG 안에서 노드가 놓인 자리를 구한다. PNG는 노드가 그려지는 범위(그림자, 노드 밖 자식 포함)를 담으므로,
 * 노드 상자와 그려지는 범위의 차이가 PNG 안 노드 위치다. 소수 오차는 0.01px로 반올림한다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param box 노드 상자(absoluteBoundingBox)
 * @param render 그려지는 범위(absoluteRenderBounds). 없으면 노드 상자와 같다고 본다
 * @returns PNG 안 노드 위치와 크기
 */
export function nodeBox(box: Bounds, render: Bounds | null): NodeBox {
  const origin = render ?? box;
  return {
    x: roundPx(box.x - origin.x),
    y: roundPx(box.y - origin.y),
    width: roundPx(box.width),
    height: roundPx(box.height),
  };
}

/**
 * 좌표를 0.01px로 반올림한다.
 * @param value 좌표
 * @returns 반올림한 좌표
 */
function roundPx(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

/**
 * 대상 폴더의 export.json.
 * - name: 피그마 컴포넌트(세트) 이름. 조립은 `영역/이름`
 * - nodeId: 컴포넌트 세트나 단독 컴포넌트 ID. 이름이 바뀐 폴더를 찾는 데 쓴다
 * - variants: 변형 파일 이름(확장자 제외) → 변형
 * - description: 컴포넌트 description. 없으면 적지 않는다
 * - propertyDefinitions: 컴포넌트 속성 정의(구현 참고용)
 */
export type ExportManifest = {
  name: string;
  nodeId: string;
  variants: Record<string, VariantEntry>;
  description?: string;
  propertyDefinitions?: JsonObject;
};

/** figma/figma.json. 바뀌지 않는 전역 값만 둔다 */
export type FigmaSettings = { fileKey: string; scale: number };

/** 대상 폴더 안 export.json 이름 */
export const MANIFEST_FILE = 'export.json';

/**
 * 변형 PNG 파일 이름을 만든다.
 * @param variant 변형 이름
 * @returns `<변형>.png`
 */
export function pngFile(variant: string): string {
  return `${variant}.png`;
}

/**
 * export.json 문자열을 만든다. 내보낸 시각 같은 값은 두지 않아, 같은 피그마를 다시 내보내면 내용이 같다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param manifest export.json
 * @returns 키를 정렬한 JSON 문자열
 */
export function manifestText(manifest: ExportManifest): string {
  const variants: JsonObject = {};
  for (const [variant, entry] of Object.entries(manifest.variants)) {
    variants[variant] = {
      nodeId: entry.nodeId,
      properties: { ...entry.properties },
      node: { ...entry.node },
      ...(entry.tree === undefined ? {} : { tree: entry.tree }),
      ...(entry.report === undefined ? {} : { report: reportJson(entry.report) }),
    };
  }
  return stableStringify({
    name: manifest.name,
    nodeId: manifest.nodeId,
    ...(manifest.description === undefined ? {} : { description: manifest.description }),
    ...(manifest.propertyDefinitions === undefined
      ? {}
      : { propertyDefinitions: manifest.propertyDefinitions }),
    variants,
  });
}

/**
 * 조립 보고를 JSON으로 옮긴다.
 * @param report 조립 보고
 * @returns JSON 객체
 */
function reportJson(report: PatternReport): JsonObject {
  return {
    components: report.components.map(
      /**
       * 보고 줄을 JSON으로 옮긴다.
       * @param item 보고 줄
       */
      (item) => ({
        component: item.component,
        properties: { ...item.properties },
        paths: [...item.paths],
      }),
    ),
    drawn: report.drawn.map((item) => ({ ...item })),
    offToken: report.offToken.map((item) => ({ ...item })),
    displayOnly: report.displayOnly.map((item) => ({ ...item })),
    motion: report.motion.map((item) => ({ ...item })),
  };
}

/**
 * 폴더에 있어야 할 파일 이름(export.json과 변형 PNG)을 만든다. 나머지 파일은 지울 대상이다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param manifest export.json
 * @returns 폴더 안 파일 이름
 */
export function manifestFiles(manifest: ExportManifest): string[] {
  return [MANIFEST_FILE, ...Object.keys(manifest.variants).map(pngFile)];
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
 * 저장소에 있는 export.json에서 nodeId를 읽는다.
 * @param text export.json 내용
 * @returns nodeId, 읽을 수 없으면 null
 */
export function readManifestNodeId(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  return typeof parsed.nodeId === 'string' ? parsed.nodeId : null;
}

/**
 * 이번에 내보낸 대상과 nodeId가 같지만 폴더가 다른 폴더(이름이 바뀐 대상의 이전 폴더)를 찾는다.
 * 그 폴더로 이번에 함께 내보낸 대상이 있으면 이름이 바뀐 것이 아니므로 제외한다.
 * @param exported 이번에 내보낸 대상의 폴더와 nodeId
 * @param others 저장소에 있는 폴더 → nodeId
 * @returns 이전 폴더 → 그 nodeId를 가진 이번 대상의 폴더
 */
export function renamedFolders(
  exported: readonly { folder: string; nodeId: string }[],
  others: ReadonlyMap<string, string>,
): Map<string, string> {
  const folders = new Set(exported.map((item) => item.folder));
  const renamed = new Map<string, string>();
  for (const [folder, nodeId] of [...others].sort(([a], [b]) => a.localeCompare(b))) {
    const owner = exported.find((item) => item.nodeId === nodeId);
    if (owner !== undefined && !folders.has(folder)) {
      renamed.set(folder, owner.folder);
    }
  }
  return renamed;
}

/**
 * 값이 배열이 아닌 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
