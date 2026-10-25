import { type ExportManifest, nodeBox, type VariantEntry } from '../export-manifest';
import { assetFile, variantSlug } from '../naming';
import { utf8Encode } from '../sha256';
import { monoColorSvg, normalizeSvgBytes, utf8Decode } from '../svg-normalize';
import { relativeTransform, trimmedPathSvg, type TrimmedVector } from '../svg-trim';
import { type CheckContext, checkVariant, type Violation } from './check-structure';
import type { AssetData, NodeData } from './node-data';
import { isMotionApiError } from './read-motion';
import { type NameCache, readNodeTree } from './read-node';

// 컴포넌트나 조립 하나를 검사하고 export.json 내용, 변형 PNG, 쓰는 자산 파일을 만든다.
// 플러그인 UI와 피그마 MCP(use_figma)가 같은 함수를 쓴다. GitHub와 UI는 모르고, 파일을 바꾸지 않는다.

/** 내보낸 대상(컴포넌트나 조립) */
export type TargetExport = {
  manifest: ExportManifest;
  /** 변형 이름 → PNG */
  pngs: Map<string, Uint8Array>;
  /** 자산 파일(`<묶음>/<자산>.<svg|png>`) → 내용 */
  assets: Map<string, Uint8Array>;
};

export type TargetOutcome =
  { ok: true; target: TargetExport } | { ok: false; name: string; violations: Violation[] };

/**
 * 컴포넌트(세트)를 변형마다 구조 검사하고 내보낸다. 위반이 하나라도 있으면 파일을 만들지 않고 위반을 모두 돌려준다.
 * 내보내는 것은 변형 이름과 속성, 변형 PNG와 PNG 안 노드 위치, 쓰는 자산 파일이다. 레이어 정보는 내보내지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param nodeId 컴포넌트 세트나 단독 컴포넌트 ID
 * @param scale PNG 배율
 * @param context 구조 검사에 쓰는 파일 정보
 * @returns 내보낸 대상, 또는 위반 목록
 */
export async function exportTargetCore(
  nodeId: string,
  scale: number,
  context: CheckContext,
): Promise<TargetOutcome> {
  const node = await findComponent(nodeId);
  if (node === null) {
    throw new Error(`컴포넌트 ${nodeId}를 찾을 수 없다.`);
  }
  const names: NameCache = new Map();
  const violations: Violation[] = [];
  const variants: Record<string, VariantEntry> = {};
  const assetNodes = new Map<string, AssetData>();
  const nodes = new Map<string, ComponentNode>();
  for (const variant of variantsOf(node)) {
    const tree = await readNodeTree(variant, names);
    violations.push(...checkVariant(tree, `${node.name} / ${variant.name}`, context));
    collectAssets(tree, assetNodes);
    const properties = propertiesOf(node, variant);
    const slug = variantSlug(properties);
    if (slug in variants) {
      throw new Error(`${node.name}: 변형 파일 이름 "${slug}"가 겹친다.`);
    }
    const box = variant.absoluteBoundingBox;
    if (box === null) {
      throw new Error(`${node.name} / ${variant.name}: 노드 상자를 읽을 수 없다.`);
    }
    variants[slug] = {
      nodeId: variant.id,
      properties,
      node: nodeBox(box, variant.absoluteRenderBounds),
    };
    nodes.set(slug, variant);
  }
  if (violations.length > 0) {
    return { ok: false, name: node.name, violations };
  }
  const pngs = new Map<string, Uint8Array>();
  for (const [slug, variant] of nodes) {
    pngs.set(slug, await exportPng(variant, scale));
  }
  const assets = new Map<string, Uint8Array>();
  for (const [file, asset] of assetNodes) {
    assets.set(file, await exportAsset(asset));
  }
  return {
    ok: true,
    target: { manifest: { name: node.name, nodeId: node.id, variants }, pngs, assets },
  };
}

/**
 * 컴포넌트(세트)의 변형 PNG만 다시 내보낸다. 바뀐 토큰을 쓰는 컴포넌트의 모습만 갱신할 때 쓴다(구조 검사는 하지 않는다).
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param nodeId 컴포넌트 세트나 단독 컴포넌트 ID
 * @param variants 내보낼 변형 이름(저장소에 있는 변형)
 * @param scale PNG 배율
 * @returns 변형 이름 → PNG, 노드를 찾지 못하면 null
 */
export async function exportVariantImages(
  nodeId: string,
  variants: ReadonlySet<string>,
  scale: number,
): Promise<Map<string, Uint8Array> | null> {
  const node = await findComponent(nodeId);
  if (node === null) {
    return null;
  }
  const pngs = new Map<string, Uint8Array>();
  for (const variant of variantsOf(node)) {
    const slug = variantSlug(propertiesOf(node, variant));
    if (variants.has(slug)) {
      pngs.set(slug, await exportPng(variant, scale));
    }
  }
  return pngs;
}

/**
 * ID로 컴포넌트 세트나 단독 컴포넌트를 찾는다.
 * @param nodeId 노드 ID
 * @returns 노드, 없거나 컴포넌트가 아니면 null
 */
async function findComponent(nodeId: string): Promise<ComponentSetNode | ComponentNode | null> {
  const node = await figma.getNodeByIdAsync(nodeId);
  return node !== null && (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT')
    ? node
    : null;
}

/**
 * 컴포넌트 세트의 변형 목록을 구한다. 단독 컴포넌트는 자기 하나다.
 * @param node 컴포넌트 세트나 단독 컴포넌트
 * @returns 변형 목록
 */
function variantsOf(node: ComponentSetNode | ComponentNode): ComponentNode[] {
  return node.type === 'COMPONENT_SET'
    ? node.children.filter((child): child is ComponentNode => child.type === 'COMPONENT')
    : [node];
}

/**
 * 변형 속성을 피그마 순서대로 읽는다. 단독 컴포넌트는 비어 있다.
 * @param node 컴포넌트 세트나 단독 컴포넌트
 * @param variant 변형
 * @returns 변형 속성 이름 → 값
 */
function propertiesOf(
  node: ComponentSetNode | ComponentNode,
  variant: ComponentNode,
): Record<string, string> {
  return node.type === 'COMPONENT_SET' ? { ...variant.variantProperties } : {};
}

/**
 * 변형을 PNG로 내보낸다.
 * @param variant 변형
 * @param scale 배율
 * @returns PNG 바이트
 */
async function exportPng(variant: ComponentNode, scale: number): Promise<Uint8Array> {
  return variant.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
}

/**
 * 자산 인스턴스를 파일 이름별로 모은다. 같은 파일 이름에 다른 원본 컴포넌트가 있으면 실패한다.
 * @param node 노드 데이터
 * @param assets 자산 파일 → 자산
 */
function collectAssets(node: NodeData, assets: Map<string, AssetData>): void {
  if (node.asset !== null) {
    const file = assetFile(node.asset);
    const known = assets.get(file);
    if (known !== undefined && known.mainComponentId !== node.asset.mainComponentId) {
      throw new Error(`자산 파일 "${file}"에 해당하는 컴포넌트가 둘 이상이다.`);
    }
    assets.set(file, node.asset);
    return;
  }
  for (const child of node.children) {
    collectAssets(child, assets);
  }
}

/**
 * 자산 원본 컴포넌트를 파일로 내보낸다.
 * 한 가지 색 자산은 SVG의 색을 currentColor로 바꾸고(색은 코드의 글자 색 클래스가 정한다),
 * 여러 색 자산은 SVG 그대로, 래스터 이미지는 PNG(배율 1)로 내보낸다. SVG 안의 id는 내용으로 정해지는 이름으로 바꾼다.
 * 경로 트림이 걸린 벡터는 벡터 경로와 트림 기본값으로 `pathLength="1"`·`stroke-dasharray` 요소를 직접 만든다.
 * 트림이 없는 자산은 피그마가 내보낸 SVG를 그대로 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @codocs [[피그마 연동:모션]]
 * @param asset 자산
 * @returns 파일 내용
 */
async function exportAsset(asset: AssetData): Promise<Uint8Array> {
  const node = await figma.getNodeByIdAsync(asset.mainComponentId);
  if (node === null || node.type !== 'COMPONENT') {
    throw new Error(`자산 컴포넌트 ${asset.name}를 찾을 수 없다.`);
  }
  if (asset.kind === 'raster') {
    return rasterBytes(node);
  }
  const exported = normalizeSvgBytes(
    await node.exportAsync({ format: 'SVG', svgOutlineText: true, svgIdAttribute: false }),
  );
  const trims = trimmedVectors(node);
  const svg =
    trims.length === 0
      ? exported
      : utf8Encode(trimmedPathSvg(utf8Decode(exported), asset.name, trims));
  return asset.kind === 'mono' ? monoColorSvg(svg) : svg;
}

/**
 * 자산 컴포넌트 안에서 경로 트림 키프레임(PATH_TRIM_START·PATH_TRIM_END)이 걸린 레이어를 읽는다.
 * 경로는 벡터의 `vectorPaths`(트림 전 전체), 위치는 두 노드의 `absoluteTransform`, 보이는 범위는 트랙의 기본값(baseValue)이다.
 * 트랙이 없는 쪽은 트림이 없는 값(시작 0, 끝 1)이다.
 * @codocs [[피그마 연동:모션]]
 * @param component 자산 컴포넌트
 * @returns 트림 레이어
 */
function trimmedVectors(component: ComponentNode): TrimmedVector[] {
  let nodes: SceneNode[];
  try {
    nodes = component.findAll((node) => {
      const tracks = trimTracks(node);
      return tracks.start !== undefined || tracks.end !== undefined;
    });
  } catch (error) {
    if (isMotionApiError(error)) {
      throw new Error(
        `자산 ${component.name}: 모션 API를 쓸 수 없어 경로 트림을 확인할 수 없다. 모션 기능을 쓸 수 있는 계정으로 내보낸다.`,
      );
    }
    throw error;
  }
  return nodes.map((node) => trimmedVector(component, node));
}

/**
 * 트림 레이어 하나를 순수 데이터로 옮긴다.
 * @param component 자산 컴포넌트
 * @param node 트림 레이어
 * @returns 트림 벡터
 */
function trimmedVector(component: ComponentNode, node: SceneNode): TrimmedVector {
  const tracks = trimTracks(node);
  return {
    name: node.name,
    paths: node.type === 'VECTOR' ? node.vectorPaths.map((path) => path.data) : null,
    transform: relativeTransform(component.absoluteTransform, node.absoluteTransform),
    start: trimBase(tracks.start, 0),
    end: trimBase(tracks.end, 1),
  };
}

/**
 * 노드의 경로 트림 트랙을 꺼낸다.
 * @param node 노드
 * @returns 시작·끝 트랙(없으면 undefined)
 */
function trimTracks(node: SceneNode): {
  start: ManualKeyframeBinding | undefined;
  end: ManualKeyframeBinding | undefined;
} {
  if (!('manualKeyframeTracks' in node)) {
    return { start: undefined, end: undefined };
  }
  const tracks = node.manualKeyframeTracks;
  return { start: tracks.PATH_TRIM_START, end: tracks.PATH_TRIM_END };
}

/**
 * 트림 트랙의 기본값을 읽는다.
 * @param track 트림 트랙
 * @param fallback 트랙이 없을 때의 값
 * @returns 기본값, 숫자가 아니면 null
 */
function trimBase(track: ManualKeyframeBinding | undefined, fallback: number): number | null {
  if (track === undefined) {
    return fallback;
  }
  return track.baseValue.type === 'FLOAT' ? track.baseValue.value : null;
}

/**
 * 이미지 자산의 바이트를 읽는다. 이미지 칠 하나만 있으면 원본 이미지를, 아니면 1배 PNG를 쓴다.
 * 원본을 쓰면 토큰의 이미지 칠과 같은 해시의 파일이 된다.
 * @codocs [[피그마 연동:자산]]
 * @param node 자산 컴포넌트
 * @returns PNG 등 이미지 바이트
 */
export async function rasterBytes(node: ComponentNode): Promise<Uint8Array> {
  const fills =
    node.fills === figma.mixed ? [] : node.fills.filter((fill) => fill.visible !== false);
  const [fill] = fills;
  if (fills.length === 1 && fill?.type === 'IMAGE' && fill.imageHash !== null) {
    const image = figma.getImageByHash(fill.imageHash);
    if (image !== null) {
      return image.getBytesAsync();
    }
  }
  return node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
}
