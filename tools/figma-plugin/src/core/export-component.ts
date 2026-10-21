import { parityDecisions } from '../../../../packages/design-system/scripts/parity/rules/decisions';
import type {
  BooleanProperty,
  CaseEntry,
  ComponentManifest,
  VariantEntry,
} from '../export-manifest';
import { componentHash, variantHash } from '../export-manifest';
import { assetFile, booleanPropName, componentSlug, variantSlug } from '../naming';
import { monoColorSvg, normalizeSvgBytes } from '../svg-normalize';
import { buildLayers, hiddenLayerPaths } from './build-layers';
import { type CheckContext, checkVariant, type Violation } from './check-structure';
import type { AssetData, NodeData } from './node-data';
import { type NameCache, readNodeTree } from './read-node';

// 컴포넌트 하나를 검사하고 export.json 내용, 변형 PNG, 아이콘 SVG를 만든다.
// 플러그인 UI와 피그마 MCP(use_figma)가 같은 함수를 쓴다. GitHub와 UI는 모른다.
// BOOLEAN 속성 경우를 만들 때만 임시 인스턴스를 만들고, 끝나면 반드시 지운다(파일에 남는 변경은 없다).

/** 내보낸 컴포넌트 */
export type ComponentExport = {
  slug: string;
  manifest: ComponentManifest;
  /** 변형 이름 → PNG */
  pngs: Map<string, Uint8Array>;
  /** 자산 파일(`<묶음>/<자산>.<svg|png>`) → 내용 */
  assets: Map<string, Uint8Array>;
};

export type ComponentOutcome =
  { ok: true; component: ComponentExport } | { ok: false; name: string; violations: Violation[] };

// 숫자 이름 간격 토큰을 찾는 패턴이다(D1).
const insetTokenPattern = new RegExp(parityDecisions.d1.insetTokenPattern, 'u');
// 임시 인스턴스를 두는 위치. 캔버스의 다른 노드와 겹치지 않게 멀리 둔다.
const TEMPORARY_OFFSET = -100_000;

/**
 * 파일의 숫자 이름 간격 토큰(spacing/<숫자>)을 값별로 모은다(D1 절대 위치 거리 이름 찾기).
 * @codocs [[피그마 일치 검사:결정 사항]]
 * @returns 검사 정보
 */
export async function readCheckContext(): Promise<CheckContext> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const defaultModes = new Map(collections.map((item) => [item.id, item.defaultModeId]));
  const scale = new Map<number, string[]>();
  for (const variable of await figma.variables.getLocalVariablesAsync('FLOAT')) {
    if (!insetTokenPattern.test(variable.name)) {
      continue;
    }
    const value = variable.valuesByMode[defaultModes.get(variable.variableCollectionId) ?? ''];
    if (typeof value === 'number') {
      scale.set(value, [...(scale.get(value) ?? []), variable.name]);
    }
  }
  return { spacingScale: scale };
}

/**
 * 컴포넌트(세트)를 검사하고 내보낸다. 위반이 하나라도 있으면 파일을 만들지 않고 위반 목록을 돌려준다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param nodeId 컴포넌트 세트나 단독 컴포넌트 ID
 * @param context 검사 정보
 * @param scale PNG 배율
 * @returns 내보낸 컴포넌트, 또는 위반 목록
 */
export async function exportComponentCore(
  nodeId: string,
  context: CheckContext,
  scale: number,
): Promise<ComponentOutcome> {
  // 인스턴스 안의 숨긴 레이어도 읽어야 숨김 목록(D4)이 맞다. 실행 환경마다 기본값이 달라(피그마 MCP는 true)
  // 플러그인과 MCP가 같은 결과를 내도록 여기서 정하고 끝나면 되돌린다.
  const shouldSkipInvisible = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = false;
  try {
    return await exportComponentWithHidden(nodeId, context, scale);
  } finally {
    figma.skipInvisibleInstanceChildren = shouldSkipInvisible;
  }
}

/**
 * exportComponentCore의 본문이다. 인스턴스 안의 숨긴 레이어를 읽는 상태에서 실행한다.
 * @param nodeId 컴포넌트 세트나 단독 컴포넌트 ID
 * @param context 검사 정보
 * @param scale PNG 배율
 * @returns 내보낸 컴포넌트, 또는 위반 목록
 */
async function exportComponentWithHidden(
  nodeId: string,
  context: CheckContext,
  scale: number,
): Promise<ComponentOutcome> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT')) {
    throw new Error(`컴포넌트 ${nodeId}를 찾을 수 없다.`);
  }
  const variants =
    node.type === 'COMPONENT_SET'
      ? node.children.filter((child): child is ComponentNode => child.type === 'COMPONENT')
      : [node];
  const booleans = booleanProperties(node);
  const names: NameCache = new Map();
  const violations: Violation[] = [];
  const trees = new Map<ComponentNode, NodeData>();
  for (const variant of variants) {
    const tree = await readNodeTree(variant, names);
    trees.set(variant, tree);
    violations.push(...checkVariant(tree, `${node.name} / ${variant.name}`, context));
  }
  violations.push(...(await checkHiddenLayers(node.name, trees)));

  const entries: Record<string, VariantEntry> = {};
  const pngs = new Map<string, Uint8Array>();
  const assetNodes = new Map<string, AssetData>();
  for (const [variant, tree] of trees) {
    const slug = variantSlug(node.type === 'COMPONENT_SET' ? { ...variant.variantProperties } : {});
    if (slug in entries) {
      throw new Error(`${node.name}: 변형 파일 이름 "${slug}"가 겹친다.`);
    }
    collectAssets(tree, assetNodes);
    const cases: Record<string, CaseEntry> = {};
    if (parityDecisions.d4.exportBooleanCases) {
      for (const [prop, property] of Object.entries(booleans)) {
        const isEnabled = !property.defaultValue;
        const caseTree = await readBooleanCase(variant, property.key, isEnabled, names);
        const where = `${node.name} / ${variant.name} / ${prop}=${String(isEnabled)}`;
        violations.push(...checkVariant(caseTree, where, context));
        collectAssets(caseTree, assetNodes);
        cases[`${prop}=${String(isEnabled)}`] = {
          layers: buildLayers(caseTree, context),
          hidden: hiddenLayerPaths(caseTree),
        };
      }
    }
    if (violations.length > 0) {
      continue;
    }
    const png = await variant.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: scale },
    });
    pngs.set(slug, png);
    const info = {
      properties: node.type === 'COMPONENT_SET' ? { ...variant.variantProperties } : {},
      layers: buildLayers(tree, context),
      hidden: hiddenLayerPaths(tree),
      cases,
    };
    entries[slug] = { nodeId: variant.id, ...info, hash: variantHash(info) };
  }
  if (violations.length > 0) {
    return { ok: false, name: node.name, violations };
  }

  const assets = new Map<string, Uint8Array>();
  for (const [file, asset] of assetNodes) {
    assets.set(file, await exportAsset(asset));
  }
  return {
    ok: true,
    component: {
      slug: componentSlug(node.name),
      manifest: {
        name: node.name,
        nodeId: node.id,
        hash: componentHash(Object.values(entries)),
        booleans,
        variants: entries,
      },
      pngs,
      assets,
    },
  };
}

/**
 * 컴포넌트(세트)의 BOOLEAN 속성을 prop 이름으로 모은다.
 * @param node 컴포넌트 세트나 단독 컴포넌트
 * @returns prop 이름 → 속성 키와 기본값
 */
function booleanProperties(
  node: ComponentSetNode | ComponentNode,
): Record<string, BooleanProperty> {
  const result: Record<string, BooleanProperty> = {};
  for (const [key, definition] of Object.entries(node.componentPropertyDefinitions)) {
    if (definition.type === 'BOOLEAN') {
      result[booleanPropName(key)] = { key, defaultValue: definition.defaultValue === true };
    }
  }
  return result;
}

/**
 * BOOLEAN 속성 하나를 바꾼 임시 인스턴스를 만들어 읽고 지운다(D4 a).
 * @param variant 변형
 * @param key 속성 키
 * @param isEnabled 바꿀 값
 * @param names 이름 캐시
 * @returns 임시 인스턴스의 노드 데이터
 */
async function readBooleanCase(
  variant: ComponentNode,
  key: string,
  isEnabled: boolean,
  names: NameCache,
): Promise<NodeData> {
  const instance = variant.createInstance();
  try {
    instance.x = TEMPORARY_OFFSET;
    instance.y = TEMPORARY_OFFSET;
    instance.setProperties({ [key]: isEnabled });
    return await readNodeTree(instance, names);
  } finally {
    instance.remove();
  }
}

/**
 * 숨긴 레이어를 검사한다(D4 c, d).
 * 속성 없이 모든 변형에서 숨긴 레이어와, 속성 없이 숨겼는데 파일의 인스턴스에서 켜서 쓰는 레이어를 막는다.
 * @param componentName 컴포넌트 이름
 * @param trees 변형 → 노드 데이터
 * @returns 위반 목록
 */
async function checkHiddenLayers(
  componentName: string,
  trees: ReadonlyMap<ComponentNode, NodeData>,
): Promise<Violation[]> {
  const visiblePaths = new Set<string>();
  for (const tree of trees.values()) {
    collectPaths(tree, visiblePaths);
  }
  const violations: Violation[] = [];
  const reported = new Set<string>();
  for (const [variant, tree] of trees) {
    for (const hidden of allHidden(tree)) {
      if (hidden.visibleProperty !== undefined) {
        continue;
      }
      const where = `${componentName} / ${hidden.path}`;
      if (
        parityDecisions.d4.blockAlwaysHiddenWithoutProperty &&
        !visiblePaths.has(hidden.path) &&
        !reported.has(where)
      ) {
        reported.add(where);
        violations.push({
          where,
          reason: '모든 변형에서 숨겼고 컴포넌트 속성도 없어 쓰이지 않는 레이어다(D4)',
          fix: '레이어를 지운다. 켜서 쓸 레이어면 BOOLEAN 컴포넌트 속성에 연결한다.',
        });
      }
      if (parityDecisions.d4.blockShownByInstanceOverride && !reported.has(`${where}#shown`)) {
        for (const instance of await variant.getInstancesAsync()) {
          const found = findByPath(instance, hidden.path);
          if (found?.visible === true) {
            reported.add(`${where}#shown`);
            violations.push({
              where: `${componentName} / ${variant.name} / ${hidden.path}`,
              reason: `속성 없이 숨긴 레이어를 인스턴스(${instance.id})에서 켜서 쓴다(D4)`,
              fix: '레이어 보이기를 BOOLEAN 컴포넌트 속성에 연결한다.',
            });
            break;
          }
        }
      }
    }
  }
  return violations;
}

/**
 * 보이는 레이어 경로를 모은다.
 * @param node 노드 데이터
 * @param paths 모을 집합
 */
function collectPaths(node: NodeData, paths: Set<string>): void {
  paths.add(node.path);
  for (const child of node.children) {
    collectPaths(child, paths);
  }
}

/**
 * 노드 아래 숨긴 레이어를 모두 모은다.
 * @param node 노드 데이터
 * @returns 숨긴 레이어 목록
 */
function allHidden(node: NodeData): NodeData['hiddenChildren'] {
  return [...node.hiddenChildren, ...node.children.flatMap(allHidden)];
}

/**
 * 레이어 경로로 노드를 찾는다.
 * @param root 시작 노드
 * @param path 레이어 경로
 * @returns 노드, 없으면 null
 */
function findByPath(root: SceneNode, path: string): SceneNode | null {
  let current: SceneNode | null = root;
  for (const name of path.split('/')) {
    if (current === null || !('children' in current)) {
      return null;
    }
    current = current.children.find((child) => child.name === name) ?? null;
  }
  return current;
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
 * 자산 원본 컴포넌트를 파일로 내보낸다(D6).
 * 한 가지 색 자산은 SVG의 색을 currentColor로 바꾸고(색은 코드의 글자 색 클래스가 정한다),
 * 여러 색 자산은 SVG 그대로, 래스터 이미지는 PNG(배율 1)로 내보낸다. SVG 안의 id는 내용으로 정해지는 이름으로 바꾼다.
 * @codocs [[피그마 일치 검사:자산]]
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
  const svg = normalizeSvgBytes(
    await node.exportAsync({ format: 'SVG', svgOutlineText: true, svgIdAttribute: false }),
  );
  return asset.kind === 'mono' ? monoColorSvg(svg) : svg;
}

/**
 * 이미지 자산(G4)의 바이트를 읽는다. 이미지 칠 하나만 있으면 원본 이미지를, 아니면 1배 PNG를 쓴다.
 * 원본을 쓰면 토큰의 이미지 칠과 같은 해시의 파일이 된다.
 * @codocs [[피그마 일치 검사:자산]]
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
