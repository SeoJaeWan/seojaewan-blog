import {
  childLayerKeys,
  type Easing,
  type MotionKeyframe,
  type MotionProperty,
  type MotionTimeline,
  type MotionTrack,
  type MotionValue,
} from '../../../../packages/design-system/src/figma-contract';
import type { MotionProblem, NodeData } from './node-data';

// 변형과 자산 원본에 걸린 키프레임을 스키마의 꼴로 읽는다. 노드를 바꾸지 않는다(읽기 전용).
// 컴포넌트를 통째로 움직이는 키프레임은 `motion` 레이어에, 안쪽 부품의 움직임은 그 레이어에, 자산 안쪽의 움직임은
// 자산 원본에 걸려 있다([[디자인 시스템:모션 견본]]). 값은 피그마 값 그대로다(초, 반시계 방향이 + 인 회전).

/**
 * 옮기는 키프레임 항목([[디자인 시스템:모션]]의 표). 다른 항목은 구조 검사가 막는다.
 * @codocs [[디자인 시스템:모션]]
 */
export const motionProperties: readonly MotionProperty[] = [
  'OPACITY',
  'SCALE_XY',
  'SCALE_X',
  'SCALE_Y',
  'TRANSLATION_XY',
  'TRANSLATION_X',
  'TRANSLATION_Y',
  'ROTATION',
  'PATH_TRIM_START',
  'PATH_TRIM_END',
];
// 칠·선·효과 키프레임을 담는 항목
const listFields: readonly string[] = ['fills', 'strokes', 'effects'];
// 피그마가 사용자 기능 플래그로 막은 API를 부르면 나오는 오류 문장이다.
const UNSUPPORTED_API_TEXT = 'is not a supported API';

/** 변형 하나에서 읽은 움직임 */
export type VariantMotion = { motion: MotionTimeline[]; problems: MotionProblem[] };

/**
 * 변형에서 도는 키프레임을 읽는다. 변형 안에 바로 놓인 레이어(숨긴 레이어와 놓인 인스턴스 자신 포함)가 정의한 키프레임은
 * 변형의 타임라인이고, 변형 안에 바로 놓인 자산 인스턴스마다 그 자산 원본에 걸린 키프레임은 자산의 타임라인이다.
 * 품은 컴포넌트 인스턴스 안쪽의 움직임은 그 컴포넌트가 적는다.
 * @codocs [[디자인 시스템:모션 견본]]
 * @codocs [[디자인 시스템:모션]]
 * @param variant 변형 노드
 * @param root 변형의 노드 데이터
 * @returns 타임라인과 내보낼 수 없는 키프레임
 */
export async function readVariantMotion(
  variant: ComponentNode,
  root: NodeData,
): Promise<VariantMotion> {
  const problems: MotionProblem[] = [];
  try {
    const motion: MotionTimeline[] = [];
    const own = ownNodes(root);
    const tracks: MotionTrack[] = [];
    for (const data of own) {
      const node = await figma.getNodeByIdAsync(data.id);
      if (node !== null && isSceneNode(node)) {
        tracks.push(...(await nodeTracks(node, { layer: data.key, assetLayer: null }, problems)));
      }
    }
    if (tracks.length > 0) {
      motion.push({
        owner: { kind: 'variant' },
        isLooping: loopOf(variant),
        duration: timelineDuration(variant, tracks),
        tracks,
      });
    }
    for (const data of own) {
      if (data.asset === null) {
        continue;
      }
      const main = await figma.getNodeByIdAsync(data.asset.mainComponentId);
      if (main?.type !== 'COMPONENT') {
        continue;
      }
      const assetTracks = await assetOriginTracks(main, data.key, problems);
      if (assetTracks.length > 0) {
        motion.push({
          owner: { kind: 'asset', layer: data.key },
          isLooping: loopOf(main),
          duration: timelineDuration(main, assetTracks),
          tracks: assetTracks,
        });
      }
    }
    return { motion, problems };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(UNSUPPORTED_API_TEXT)) {
      throw error;
    }
    return {
      motion: [],
      problems: [
        {
          nodeId: variant.id,
          layer: '',
          property: '',
          reason: '피그마 모션 API를 쓸 수 없는 계정이라 키프레임을 읽지 못했다',
        },
      ],
    };
  }
}

/**
 * 변형에 바로 놓인 노드(인스턴스 안쪽이 아닌 노드)를 모은다.
 * @param root 변형 루트
 * @returns 변형 루트와 그 아래 노드
 */
function ownNodes(root: NodeData): NodeData[] {
  const result: NodeData[] = [];
  /**
   * 인스턴스 안쪽으로 내려가지 않고 노드를 모은다.
   * @param node 노드
   */
  function walk(node: NodeData): void {
    if (node.isInsideInstance) {
      return;
    }
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(root);
  return result;
}

/**
 * 자산 원본(루트와 안쪽 레이어)에 걸린 키프레임을 읽는다. 안쪽 레이어는 자산 원본 안의 경로(레이어 키 규칙)로 적는다.
 * @param main 자산 원본 컴포넌트
 * @param instanceKey 변형 안 자산 인스턴스의 키
 * @param problems 내보낼 수 없는 키프레임을 더할 목록
 * @returns 트랙
 */
async function assetOriginTracks(
  main: ComponentNode,
  instanceKey: string,
  problems: MotionProblem[],
): Promise<MotionTrack[]> {
  const tracks: MotionTrack[] = [];
  /**
   * 노드와 그 아래의 키프레임을 읽는다.
   * @param node 자산 원본 안의 노드
   * @param path 자산 원본 안의 경로
   */
  async function walk(node: SceneNode, path: string): Promise<void> {
    tracks.push(...(await nodeTracks(node, { layer: instanceKey, assetLayer: path }, problems)));
    if ('children' in node) {
      const keys = childLayerKeys(
        path,
        node.children.map((child) => child.name),
      );
      for (const [index, child] of node.children.entries()) {
        await walk(child, keys[index] ?? '');
      }
    }
  }
  await walk(main, '');
  return tracks;
}

/**
 * 노드 하나가 정의한 키프레임을 트랙으로 읽는다. 정의한 항목은 `manualKeyframeTracks`로 고르고(원본에서 이어진 것은 뺀다),
 * 트랙 연산과 키프레임은 같은 항목의 `animations`에서 읽는다. 옮기는 항목 밖의 키프레임은 문제로 더한다.
 * @param node 노드
 * @param at 트랙의 레이어 키와 자산 원본 안 경로
 * @param at.layer 레이어 키
 * @param at.assetLayer 자산 원본 안 경로. 자산이 아니면 null
 * @param problems 내보낼 수 없는 키프레임을 더할 목록
 * @returns 트랙
 */
async function nodeTracks(
  node: SceneNode,
  at: { layer: string; assetLayer: string | null },
  problems: MotionProblem[],
): Promise<MotionTrack[]> {
  if (!('manualKeyframeTracks' in node) || !('animations' in node)) {
    return [];
  }
  const manual = node.manualKeyframeTracks;
  const played = node.animations;
  const result: MotionTrack[] = [];
  for (const key of Object.keys(manual)) {
    const defined: unknown = Reflect.get(manual, key);
    if (!hasKeyframes(defined)) {
      continue;
    }
    const property = motionProperties.find((item) => item === key);
    if (property === undefined) {
      problems.push({
        nodeId: node.id,
        layer: at.layer,
        property: listFields.includes(key) ? `${key}[]` : key,
        reason: `옮기는 속성 밖의 ${key} 키프레임이다`,
      });
      continue;
    }
    const binding: unknown = Reflect.get(played, key);
    if (!isKeyframeBinding(binding)) {
      continue;
    }
    const baseValue = motionValue(binding.baseValue);
    for (const track of binding.tracks) {
      if (track.keyframes.length === 0) {
        continue;
      }
      const keyframes: MotionKeyframe[] = [];
      for (const keyframe of [...track.keyframes].sort(
        (a, b) => a.timelinePosition - b.timelinePosition,
      )) {
        const value = motionValue(keyframe.value);
        const easing = await easingOf(keyframe.easing);
        if (value === null || easing === null) {
          problems.push({
            nodeId: node.id,
            layer: at.layer,
            property,
            reason:
              value === null
                ? `${keyframe.value.type} 값 키프레임은 옮길 수 없다`
                : '이징 변수의 값을 읽지 못했다',
          });
          continue;
        }
        keyframes.push({ time: keyframe.timelinePosition, value, easing });
      }
      if (baseValue === null) {
        problems.push({
          nodeId: node.id,
          layer: at.layer,
          property,
          reason: `${binding.baseValue.type} 값 키프레임은 옮길 수 없다`,
        });
        continue;
      }
      result.push({
        layer: at.layer,
        assetLayer: at.assetLayer,
        property,
        operation: track.keyframeOperation,
        baseValue,
        keyframes,
      });
    }
  }
  return result;
}

/**
 * 키프레임 이징을 읽는다. 변수에 연결했으면 그 변수의 기본 모드 값이다.
 * @codocs [[디자인 시스템:모션]]
 * @param easing 피그마 키프레임 이징
 * @returns 이징, 변수 값을 읽지 못하면 null
 */
async function easingOf(easing: MotionEasing | VariableAlias): Promise<Easing | null> {
  if (easing.type !== 'VARIABLE_ALIAS') {
    return easingData(easing);
  }
  const variable = await figma.variables.getVariableByIdAsync(easing.id);
  if (variable === null) {
    return null;
  }
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    variable.variableCollectionId,
  );
  const value: unknown =
    collection === null ? undefined : variable.valuesByMode[collection.defaultModeId];
  return isMotionEasing(value) ? easingData(value) : null;
}

/**
 * 피그마 이징을 스키마 꼴로 옮긴다. 곡선 숫자가 없는 종류는 bezier가 null이다.
 * @param easing 피그마 이징
 * @returns 이징
 */
export function easingData(
  easing: Pick<MotionEasing, 'type' | 'easingFunctionCubicBezier'>,
): Easing {
  const curve = easing.easingFunctionCubicBezier;
  return {
    type: easing.type,
    bezier: curve === undefined ? null : { x1: curve.x1, y1: curve.y1, x2: curve.x2, y2: curve.y2 },
  };
}

/**
 * 재생 설정 Loop를 읽는다. `playbackSettings`는 플러그인 타입 정의에 없어 값의 꼴을 확인한다. 읽지 못하면 끔(한 번)이다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param node 타임라인을 가진 노드
 * @returns Loop
 */
function loopOf(node: BaseNode): boolean {
  const settings: unknown = Reflect.get(node, 'playbackSettings');
  const loop: unknown =
    typeof settings === 'object' && settings !== null ? Reflect.get(settings, 'loop') : undefined;
  return loop === true;
}

/**
 * 타임라인 길이를 읽는다. 노드의 타임라인이 없으면 키프레임 묶음이 알려 준 타임라인 길이를 쓴다.
 * @param node 타임라인을 가진 노드
 * @param tracks 그 타임라인의 트랙
 * @returns 길이(초)
 */
function timelineDuration(node: SceneNode, tracks: readonly MotionTrack[]): number {
  const timelines: unknown = 'timelines' in node ? node.timelines : undefined;
  if (Array.isArray(timelines)) {
    const duration: unknown = Reflect.get(timelines[0] ?? {}, 'duration');
    if (typeof duration === 'number') {
      return duration;
    }
  }
  return Math.max(
    0,
    ...tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
  );
}

/**
 * 키프레임 값을 스키마 꼴로 옮긴다. 숫자와 벡터만 옮긴다.
 * @param value 피그마 키프레임 값
 * @returns 값, 옮길 수 없으면 null
 */
function motionValue(value: KeyframeValue): MotionValue | null {
  if (value.type === 'FLOAT') {
    return value.value;
  }
  if (value.type === 'VECTOR') {
    return { x: value.value.x, y: value.value.y };
  }
  return null;
}

/**
 * 수동 키프레임 객체 안에 키프레임이 있는지 찾는다(칠·효과 안쪽 포함).
 * @param value 객체
 * @returns 있으면 true
 */
function hasKeyframes(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const keyframes: unknown = Reflect.get(value, 'keyframes');
  if (Array.isArray(keyframes)) {
    return keyframes.length > 0;
  }
  return Object.keys(value).some((key) => hasKeyframes(Reflect.get(value, key)));
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
 * 값이 피그마 이징인지 확인한다.
 * @param value 확인할 값
 * @returns MotionEasing이면 true
 */
function isMotionEasing(value: unknown): value is MotionEasing {
  return (
    typeof value === 'object' && value !== null && typeof Reflect.get(value, 'type') === 'string'
  );
}

/**
 * 노드가 장면 노드인지 확인한다.
 * @param node 노드
 * @returns 장면 노드면 true
 */
function isSceneNode(node: BaseNode): node is SceneNode {
  return node.type !== 'DOCUMENT' && node.type !== 'PAGE';
}
