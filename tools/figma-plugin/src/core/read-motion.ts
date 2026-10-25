import { sourceLayerId } from './bindings';
import type {
  EasingData,
  KeyframeData,
  MotionNodeKind,
  MotionSampleData,
  MotionValue,
  MotionVariable,
  ReadProblem,
  TrackData,
} from './motion-data';
import { assetGroupOf } from './read-node';

// 피그마 Motion 섹션의 견본과 모션 변수를 motion-data.ts의 순수 데이터로 읽는다. 노드를 바꾸지 않는다(읽기 전용).
// 플러그인과 피그마 MCP(use_figma) 양쪽에서 같은 코드가 실행된다.

/** UI 목록에 보이는 견본 */
export type MotionSampleSummary = { id: string; name: string };

/** 견본이 있는 페이지 이름에 든 글자(00 · Foundations) */
const FOUNDATIONS_PAGE_KEYWORD = 'Foundations';
/** 견본을 담는 섹션 이름 */
const MOTION_SECTION_NAME = 'Motion';
/** 견본 프레임 이름 앞부분 */
const MOTION_SAMPLE_PREFIX = 'motion-';
/** 모션 변수 이름 앞부분 */
const MOTION_VARIABLE_PREFIX = 'motion/';
// 피그마가 사용자 기능 플래그로 막은 API를 부르면 나오는 오류 문장이다.
const UNSUPPORTED_API_TEXT = 'is not a supported API';
// 원본을 거슬러 올라가는 최대 단계다(인스턴스 안 인스턴스).
const MAX_SOURCE_DEPTH = 8;
// 별칭을 따라가는 최대 단계다.
const MAX_ALIAS_DEPTH = 10;

/**
 * 00 · Foundations 페이지 `Motion` 섹션 안의 견본 프레임(이름이 `motion-`으로 시작)을 문서 순서대로 찾는다.
 * 페이지 ID가 정해져 있지 않아 이름에 `Foundations`가 든 페이지를 읽는다.
 * @codocs [[디자인 기반:모션 견본]]
 * @returns 견본 목록
 */
export async function listMotionSamples(): Promise<MotionSampleSummary[]> {
  const samples: MotionSampleSummary[] = [];
  for (const page of figma.root.children) {
    if (!page.name.includes(FOUNDATIONS_PAGE_KEYWORD)) {
      continue;
    }
    await page.loadAsync();
    for (const section of page.findAllWithCriteria({ types: ['SECTION'] })) {
      if (section.name !== MOTION_SECTION_NAME) {
        continue;
      }
      for (const child of section.children) {
        if (child.type === 'FRAME' && child.name.startsWith(MOTION_SAMPLE_PREFIX)) {
          samples.push({ id: child.id, name: child.name });
        }
      }
    }
  }
  return samples;
}

/**
 * 오류가 모션 API를 쓸 수 없는 계정(사용자 기능 플래그)에서 난 것인지 본다.
 * @param error 잡은 오류
 * @returns 모션 API를 쓸 수 없어서 난 오류면 true
 */
export function isMotionApiError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(UNSUPPORTED_API_TEXT);
}

/**
 * 모션 API를 쓸 수 있는지 견본 하나의 타임라인을 읽어 본다.
 * @param sampleId 견본 노드 ID
 * @returns 쓸 수 있으면 true
 */
export async function isMotionApiAvailable(sampleId: string): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(sampleId);
  if (node === null || node.type !== 'FRAME') {
    return true;
  }
  try {
    return Array.isArray(node.timelines);
  } catch (error) {
    if (isMotionApiError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * `motion/*` 로컬 변수를 읽는다. FLOAT 변수는 컬렉션 기본 모드 값을 별칭까지 풀어 둔다.
 * @codocs [[피그마 연동:모션]]
 * @returns 모션 변수
 */
export async function readMotionVariables(): Promise<MotionVariable[]> {
  const collections = new Map(
    (await figma.variables.getLocalVariableCollectionsAsync()).map((collection) => [
      collection.id,
      collection,
    ]),
  );
  const result: MotionVariable[] = [];
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    if (!variable.name.startsWith(MOTION_VARIABLE_PREFIX)) {
      continue;
    }
    result.push({
      name: variable.name,
      resolvedType: variable.resolvedType,
      value:
        variable.resolvedType === 'FLOAT' ? await defaultFloatValue(variable, collections) : null,
    });
  }
  return result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * 견본 프레임 안에서 키프레임이 걸린 노드를 찾아 트랙을 읽는다.
 * 실제로 재생되는 키프레임(`animations`, 인스턴스 안쪽 레이어로 원본에서 이어진 것 포함)의 시간·값을 쓰고,
 * 이징의 변수 연결은 키프레임을 정의한 노드(자신, 원본 컴포넌트, 원본 레이어)의 `manualKeyframeTracks`에서 읽는다.
 * `animations`에서는 이징이 풀린 곡선으로 나오기 때문이다. 숨긴 노드는 재생되지 않아 읽지 않는다.
 * @codocs [[피그마 연동:모션]]
 * @codocs [[디자인 기반:모션 견본]]
 * @param sampleId 견본 프레임 ID
 * @returns 견본 데이터
 */
export async function readMotionSample(sampleId: string): Promise<MotionSampleData> {
  const frame = await figma.getNodeByIdAsync(sampleId);
  if (frame === null || frame.type !== 'FRAME') {
    throw new Error(`모션 견본 ${sampleId}를 찾을 수 없다.`);
  }
  const sample: MotionSampleData = {
    name: frame.name,
    nodeId: frame.id,
    tracks: [],
    problems: [],
  };
  for (const child of frame.children) {
    await readTracks(child, child.name, sample);
  }
  return sample;
}

/**
 * 노드 하나의 트랙을 읽고 보이는 자식으로 내려간다.
 * @param node 노드
 * @param path 견본 기준 레이어 경로
 * @param sample 트랙과 문제를 더할 견본 데이터
 */
async function readTracks(node: SceneNode, path: string, sample: MotionSampleData): Promise<void> {
  if (!node.visible) {
    return;
  }
  // 슬롯(SLOT) 노드처럼 animations 속성이 없는 노드는 트랙이 없는 것으로 보고 자식으로만 내려간다.
  const fields = 'animations' in node ? animatedFields(node.animations) : [];
  if (fields.length > 0) {
    const identity = await nodeIdentity(node);
    for (const field of fields) {
      const label = `${path} / ${field.property}`;
      if (field.binding === null) {
        sample.problems.push({
          path: label,
          reason: '컴포넌트 속성에 묶인 칠·효과 키프레임은 내보낼 수 없다',
          fix: '키프레임을 칠·효과 항목에 직접 건다.',
        });
        continue;
      }
      const manual = await manualBinding(node, field.keys);
      for (const track of field.binding.tracks) {
        if (track.keyframes.length === 0) {
          continue;
        }
        const data: TrackData = {
          ...identity,
          path,
          property: field.property,
          operation: track.keyframeOperation,
          keyframes: await keyframesOf(track.keyframes, manual, label, sample.problems),
        };
        sample.tracks.push(data);
      }
    }
  }
  if ('children' in node) {
    for (const child of node.children) {
      await readTracks(child, `${path} / ${child.name}`, sample);
    }
  }
}

/** 키프레임이 걸린 항목 하나 */
type AnimatedField = {
  /** `manualKeyframeTracks`에서 같은 항목을 찾는 키 경로(`['fills', '0']`) */
  keys: string[];
  /** 항목 이름(`ROTATION`, `fills[0]`, `effects[0].RADIUS`) */
  property: string;
  /** 키프레임. 컴포넌트 속성에 묶인 칠·효과처럼 읽을 수 없으면 null */
  binding: KeyframeBinding | null;
};

/**
 * `animations`에서 키프레임이 있는 항목을 모은다. 칠·선은 칠 순서, 효과는 효과 순서와 항목으로 나뉜다.
 * @param animations 노드의 animations
 * @returns 키프레임이 있는 항목
 */
function animatedFields(animations: Animations): AnimatedField[] {
  const fields: AnimatedField[] = [];
  for (const [key, value] of entriesOf(animations)) {
    if (key === 'fills' || key === 'strokes' || key === 'effects') {
      for (const [index, item] of entriesOf(value)) {
        if (isKeyframeBinding(item)) {
          fields.push({ keys: [key, index], property: `${key}[${index}]`, binding: item });
          continue;
        }
        for (const [name, nested] of entriesOf(item)) {
          if (name === 'properties') {
            fields.push({ keys: [key, index, name], property: `${key}[${index}]`, binding: null });
          } else if (isKeyframeBinding(nested)) {
            fields.push({
              keys: [key, index, name],
              property: `${key}[${index}].${name}`,
              binding: nested,
            });
          }
        }
      }
      continue;
    }
    if (isKeyframeBinding(value)) {
      fields.push({ keys: [key], property: key, binding: value });
    }
  }
  return fields.filter(
    (field) =>
      field.binding === null || field.binding.tracks.some((track) => track.keyframes.length > 0),
  );
}

/**
 * 재생되는 키프레임을 순수 데이터로 옮긴다. 이징은 정의한 노드의 같은 키프레임(같은 순서, 아니면 같은 시간)에서 읽는다.
 * @param keyframes 재생되는 키프레임
 * @param manual 정의한 노드의 키프레임. 찾지 못했으면 null
 * @param label 문제 위치
 * @param problems 문제 목록
 * @returns 시간순 키프레임
 */
async function keyframesOf(
  keyframes: readonly ManualKeyframe[],
  manual: ManualKeyframeBinding | null,
  label: string,
  problems: ReadProblem[],
): Promise<KeyframeData[]> {
  const sorted = [...keyframes].sort((a, b) => a.timelinePosition - b.timelinePosition);
  const defined =
    manual === null
      ? []
      : [...manual.keyframes].sort((a, b) => a.timelinePosition - b.timelinePosition);
  const result: KeyframeData[] = [];
  for (const [index, keyframe] of sorted.entries()) {
    const value = motionValue(keyframe.value);
    if (value === null) {
      problems.push({
        path: label,
        reason: `${keyframe.value.type} 값 키프레임은 내보낼 수 없다`,
        fix: '숫자·벡터·색 항목의 키프레임만 쓴다.',
      });
      continue;
    }
    const source =
      defined.length === sorted.length
        ? defined[index]
        : defined.find((item) => item.timelinePosition === keyframe.timelinePosition);
    result.push({
      time: keyframe.timelinePosition,
      value,
      easing: source === undefined ? { kind: 'unknown' } : await easingData(source.easing),
    });
  }
  return result;
}

/**
 * 키프레임 이징을 읽는다. 변수에 연결했으면 변수 이름과 종류를 찾는다.
 * @param easing 정의한 노드의 키프레임 이징
 * @returns 이징 데이터
 */
async function easingData(easing: MotionEasing | VariableAlias): Promise<EasingData> {
  if (easing.type === 'VARIABLE_ALIAS') {
    const variable = await figma.variables.getVariableByIdAsync(easing.id);
    return variable === null
      ? { kind: 'missing-variable', id: easing.id }
      : { kind: 'variable', name: variable.name, resolvedType: variable.resolvedType };
  }
  const curve = easing.easingFunctionCubicBezier;
  return {
    kind: 'unbound',
    description:
      curve === undefined
        ? easing.type
        : `${easing.type} ${String(curve.x1)}, ${String(curve.y1)}, ${String(curve.x2)}, ${String(curve.y2)}`,
  };
}

/**
 * 키프레임을 정의한 노드의 수동 키프레임을 찾는다. 자신에게 없으면 인스턴스의 원본 컴포넌트,
 * 인스턴스 안쪽 레이어면 원본 컴포넌트 안의 같은 레이어로 거슬러 올라간다.
 * @param node 키프레임이 재생되는 노드
 * @param keys 항목 키 경로
 * @returns 수동 키프레임, 찾지 못했으면 null
 */
async function manualBinding(
  node: SceneNode,
  keys: readonly string[],
): Promise<ManualKeyframeBinding | null> {
  let current: BaseNode | null = node;
  for (let depth = 0; depth < MAX_SOURCE_DEPTH && current !== null; depth += 1) {
    if ('manualKeyframeTracks' in current) {
      const found = lookup(current.manualKeyframeTracks, keys);
      if (found !== null) {
        return found;
      }
    }
    current = await sourceNode(current);
  }
  return null;
}

/**
 * 키프레임을 물려준 노드를 찾는다. 인스턴스는 원본 컴포넌트, 인스턴스 안쪽 레이어는 원본 레이어다.
 * @param node 노드
 * @returns 원본 노드, 없으면 null
 */
async function sourceNode(node: BaseNode): Promise<BaseNode | null> {
  if (node.type === 'INSTANCE') {
    return node.getMainComponentAsync();
  }
  const sourceId = sourceLayerId(node.id);
  return sourceId === null ? null : figma.getNodeByIdAsync(sourceId);
}

/**
 * 수동 키프레임 객체에서 키 경로의 키프레임을 꺼낸다.
 * @param tracks manualKeyframeTracks
 * @param keys 키 경로
 * @returns 키프레임이 있는 항목, 없으면 null
 */
function lookup(
  tracks: ManualKeyframeTracks,
  keys: readonly string[],
): ManualKeyframeBinding | null {
  let value: unknown = tracks;
  for (const key of keys) {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    value = Reflect.get(value, key);
  }
  return isManualBinding(value) && value.keyframes.length > 0 ? value : null;
}

/**
 * 키프레임이 걸린 노드의 이름과 종류를 정한다. 인스턴스면 컴포넌트(세트) 이름, 원본이 자산이면 자산 이름이다.
 * @codocs [[피그마 연동:모션]]
 * @param node 노드
 * @returns 노드 이름과 종류
 */
async function nodeIdentity(node: SceneNode): Promise<{ node: string; nodeKind: MotionNodeKind }> {
  if (node.type !== 'INSTANCE') {
    return { node: node.name, nodeKind: 'layer' };
  }
  const main = await node.getMainComponentAsync();
  if (main === null) {
    return { node: node.name, nodeKind: 'layer' };
  }
  if (assetGroupOf(main) !== null) {
    return { node: main.name, nodeKind: 'asset' };
  }
  return {
    node: main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name,
    nodeKind: 'component',
  };
}

/**
 * 키프레임 값을 순수 데이터로 옮긴다.
 * @param value 피그마 키프레임 값
 * @returns 값, 옮길 수 없으면 null
 */
function motionValue(value: KeyframeValue): MotionValue | null {
  switch (value.type) {
    case 'FLOAT':
    case 'BOOL':
    case 'TEXT_DATA':
      return value.value;
    case 'VECTOR':
      return { x: value.value.x, y: value.value.y };
    case 'COLOR':
      return { r: value.value.r, g: value.value.g, b: value.value.b, a: value.value.a };
    case 'CIRCLE':
    case 'LINE':
    case 'CIRCLE_POINT':
      return { ...value.value };
    default:
      return null;
  }
}

/**
 * FLOAT 변수의 기본 모드 값을 별칭까지 풀어 읽는다. 모션 변수와 크기 변수(구조 검사)가 함께 쓴다.
 * @param variable 변수
 * @param collections 컬렉션 ID → 컬렉션
 * @returns 값, 풀지 못하면 null
 */
export async function defaultFloatValue(
  variable: Variable,
  collections: ReadonlyMap<string, VariableCollection>,
): Promise<number | null> {
  let current: Variable | null = variable;
  for (let depth = 0; depth < MAX_ALIAS_DEPTH && current !== null; depth += 1) {
    const collection = collections.get(current.variableCollectionId);
    const modeId = collection?.defaultModeId ?? Object.keys(current.valuesByMode)[0];
    const value = modeId === undefined ? undefined : current.valuesByMode[modeId];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value !== 'object' || !('type' in value) || value.type !== 'VARIABLE_ALIAS') {
      return null;
    }
    current = await figma.variables.getVariableByIdAsync(value.id);
  }
  return null;
}

/**
 * 객체의 값이 있는 항목을 꺼낸다. 객체가 아니면 비어 있다.
 * @param value 객체
 * @returns `[키, 값]` 목록(값이 undefined인 항목 제외)
 */
function entriesOf(value: unknown): [string, unknown][] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.keys(value)
    .map((key): [string, unknown] => [key, Reflect.get(value, key)])
    .filter(([, item]) => item !== undefined);
}

/**
 * 값이 재생되는 키프레임 묶음인지 확인한다.
 * @param value 확인할 값
 * @returns KeyframeBinding이면 true
 */
function isKeyframeBinding(value: unknown): value is KeyframeBinding {
  return typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'tracks'));
}

/**
 * 값이 수동 키프레임 묶음인지 확인한다.
 * @param value 확인할 값
 * @returns ManualKeyframeBinding이면 true
 */
function isManualBinding(value: unknown): value is ManualKeyframeBinding {
  return (
    typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'keyframes'))
  );
}
