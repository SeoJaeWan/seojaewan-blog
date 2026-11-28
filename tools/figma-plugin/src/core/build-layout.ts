import {
  COMPONENT_LAYOUT_VERSION,
  type ComponentLayout,
  type FigmaRgba,
  type LayerMeasure,
  type MeasuredPaint,
  type MeasuredShadow,
  type MeasuredStroke,
  type MeasuredText,
  type MotionTimeline,
  type MotionTimelineLayout,
  type MotionTrack,
  type MotionTrackLayout,
  type MotionValue,
  type Rgba255,
} from '../../../../packages/design-system/src/figma-contract';
import type { ComponentData, NodeData, PaintData, Rgb, VariantData } from './node-data';

// 읽은 컴포넌트 데이터를 검증 자료(`<이름>.layout.json`)로 옮기는 순수 계산이다.
// 피그마가 돌려준 최종 값에서 단위만 바꾼다. 자리는 변형 왼쪽 위 기준, 색은 0~255, 초는 밀리초, 회전은 부호를 뒤집는다.
// 값을 계산하거나 추론하지 않고, 피그마가 최종 값을 주지 않는 항목(그라데이션 방향 등)은 넣지 않는다.

const CHANNEL_MAX = 255;
const MS_PER_SECOND = 1000;
// 이미지 칠 맞춤 방식 → CSS 이름
const imageFits: Readonly<Record<string, 'cover' | 'contain'>> = { FILL: 'cover', FIT: 'contain' };
// 그라데이션 칠 종류(다이아몬드는 구조 검사가 막는다)
const GRADIENT_TYPES = ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR'] as const;

/**
 * 컴포넌트 데이터를 검증 자료로 옮긴다. 변형은 스키마와 같은 이름·순서다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param component 읽은 컴포넌트
 * @returns 검증 자료
 */
export function buildComponentLayout(component: ComponentData): ComponentLayout {
  return {
    formatVersion: COMPONENT_LAYOUT_VERSION,
    name: component.name,
    variants: component.variants.map(variantLayout),
  };
}

/**
 * 변형 하나의 값을 옮긴다. 보이는 레이어만 넣는다. 인스턴스 안쪽의 보이는 레이어는 넣고, 자산 안쪽은 넣지 않는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param variant 변형
 * @returns 변형의 검증 자료
 */
function variantLayout(variant: VariantData): ComponentLayout['variants'][number] {
  const origin = variant.root.box ?? { x: 0, y: 0, width: 0, height: 0 };
  const layers: Record<string, LayerMeasure> = {};
  /**
   * 보이는 노드와 그 아래를 옮긴다. 숨긴 노드는 안쪽도 그리지 않으므로 넣지 않는다.
   * @param node 노드
   */
  function walk(node: NodeData): void {
    if (!node.isVisible) {
      return;
    }
    const measure = layerMeasure(node, origin);
    if (measure !== null) {
      layers[node.key] = measure;
    }
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(variant.root);
  return {
    name: variant.name,
    width: origin.width,
    height: origin.height,
    layers,
    motion: variant.motion.map(timelineLayout),
  };
}

/**
 * 레이어 하나의 값을 옮긴다.
 * @param node 노드
 * @param origin 변형 루트의 자리
 * @param origin.x 변형 루트의 x
 * @param origin.y 변형 루트의 y
 * @returns 레이어 값. 피그마가 자리를 주지 않았으면 null
 */
function layerMeasure(node: NodeData, origin: { x: number; y: number }): LayerMeasure | null {
  if (node.box === null) {
    return null;
  }
  const visibleStrokes = (node.strokes ?? []).filter((paint) => paint.isVisible);
  let stroke: MeasuredStroke | null = null;
  if (visibleStrokes.length > 0 && node.strokeWeight !== undefined) {
    const weight = node.strokeWeight;
    stroke = {
      paints: measuredPaints(visibleStrokes),
      weight: {
        top: weight.top.value,
        right: weight.right.value,
        bottom: weight.bottom.value,
        left: weight.left.value,
      },
      align: node.strokeAlign,
    };
  }
  const { radius } = node;
  return {
    x: node.box.x - origin.x,
    y: node.box.y - origin.y,
    width: node.box.width,
    height: node.box.height,
    opacity: node.opacity.value,
    fills: measuredPaints(fillsOf(node)),
    stroke,
    cornerRadius:
      radius === undefined || node.text !== null
        ? null
        : {
            topLeft: radius.topLeft.value,
            topRight: radius.topRight.value,
            bottomRight: radius.bottomRight.value,
            bottomLeft: radius.bottomLeft.value,
          },
    shadows: (node.effects ?? [])
      .filter((effect) => effect.isVisible && effect.shadow !== undefined)
      .flatMap(
        /**
         * 그림자 효과 하나를 옮긴다.
         * @param effect 효과
         * @returns 그림자. 그림자가 아니면 빈 목록
         */
        (effect): MeasuredShadow[] =>
          effect.shadow === undefined ||
          (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW')
            ? []
            : [
                {
                  type: effect.type,
                  color: rgba255(effect.shadow.color),
                  offsetX: effect.shadow.offsetX,
                  offsetY: effect.shadow.offsetY,
                  radius: effect.shadow.radius,
                  spread: effect.shadow.spread,
                },
              ],
      ),
    text: measuredText(node),
    asset:
      node.asset === null
        ? null
        : {
            file: node.asset.file,
            color: node.asset.measuredColor === null ? null : rgb255(node.asset.measuredColor),
          },
  };
}

/**
 * 레이어의 칠을 고른다. 글자 칠이 섞여 있으면 첫 구간의 칠이 글자색이다.
 * @param node 노드
 * @returns 칠
 */
function fillsOf(node: NodeData): readonly PaintData[] {
  if (node.fills !== 'mixed') {
    return node.fills ?? [];
  }
  return node.text?.segments[0]?.fills ?? [];
}

/**
 * 보이는 칠을 옮긴다. 색은 0~255로, 이미지 맞춤 방식은 CSS 이름으로 바꾼다. CSS 이름이 없는 칠은 넣지 않는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param paints 칠
 * @returns 검증 자료의 칠
 */
function measuredPaints(paints: readonly PaintData[]): MeasuredPaint[] {
  const result: MeasuredPaint[] = [];
  for (const paint of paints) {
    if (!paint.isVisible) {
      continue;
    }
    if (paint.type === 'SOLID' && paint.color !== undefined) {
      result.push({ type: 'SOLID', color: rgb255(paint.color), opacity: paint.opacity });
    }
    const gradient = GRADIENT_TYPES.find((type) => type === paint.type);
    if (gradient !== undefined && paint.gradientStops !== undefined) {
      result.push({
        type: gradient,
        stops: paint.gradientStops.map((stop) => ({
          position: stop.position,
          color: rgba255(stop.color),
        })),
        opacity: paint.opacity,
      });
    }
    const fit = paint.scaleMode === undefined ? undefined : imageFits[paint.scaleMode];
    if (paint.type === 'IMAGE' && fit !== undefined) {
      result.push({ type: 'IMAGE', fit, opacity: paint.opacity });
    }
  }
  return result;
}

/**
 * 글자 레이어의 글자 값을 옮긴다. 구간이 여럿이면(구조 검사가 막는다) 첫 구간의 값이다.
 * @param node 노드
 * @returns 글자 값, 글자가 아니면 null
 */
function measuredText(node: NodeData): MeasuredText | null {
  const segment = node.text?.segments[0];
  if (node.text === null || segment === undefined) {
    return null;
  }
  return {
    fontSize: segment.fontSize,
    lineHeight: segment.lineHeight,
    fontWeight: segment.fontWeight,
    autoResize: node.text.autoResize,
  };
}

/**
 * 타임라인 하나를 옮긴다. 초를 밀리초로 바꾸고, 회전은 부호를 뒤집는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:회전 구현]]
 * @param timeline 스키마의 타임라인
 * @returns 검증 자료의 타임라인
 */
export function timelineLayout(timeline: MotionTimeline): MotionTimelineLayout {
  return {
    owner: timeline.owner,
    isLooping: timeline.isLooping,
    durationMs: timeline.duration * MS_PER_SECOND,
    tracks: timeline.tracks.map(trackLayout),
  };
}

/**
 * 트랙 하나를 옮긴다.
 * @param track 스키마의 트랙
 * @returns 검증 자료의 트랙
 */
function trackLayout(track: MotionTrack): MotionTrackLayout {
  return {
    layer: track.layer,
    assetLayer: track.assetLayer,
    property: track.property,
    operation: track.operation,
    baseValue: cssValue(track.property, track.baseValue),
    keyframes: track.keyframes.map(
      /**
       * 키프레임 하나의 시간과 값의 단위를 바꾼다.
       * @param keyframe 스키마의 키프레임
       * @returns 검증 자료의 키프레임
       */
      (keyframe) => ({
        offsetMs: keyframe.time * MS_PER_SECOND,
        value: cssValue(track.property, keyframe.value),
        easing: { type: keyframe.easing.type, bezier: keyframe.easing.bezier },
      }),
    ),
  };
}

/**
 * 키프레임 값의 단위를 CSS 쪽으로 바꾼다. 회전은 피그마가 반시계 방향이 +라 부호를 뒤집고,
 * 선 그리기 시작·끝은 피그마 값이 이미 선 길이를 1로 본 비율이라 그대로다. 나머지도 그대로다.
 * @codocs [[디자인 시스템:모션]]
 * @param property 키프레임 항목
 * @param value 피그마 값
 * @returns 검증 자료 값
 */
function cssValue(property: MotionTrack['property'], value: MotionValue): MotionValue {
  if (property === 'ROTATION' && typeof value === 'number') {
    return value === 0 ? 0 : -value;
  }
  return value;
}

/**
 * 단색(0~1)을 0~255로 옮긴다. 단색 칠의 색에는 투명도가 없어 a는 255다.
 * @param color 피그마 색
 * @returns 0~255 색
 */
function rgb255(color: Rgb): Rgba255 {
  return {
    r: color.r * CHANNEL_MAX,
    g: color.g * CHANNEL_MAX,
    b: color.b * CHANNEL_MAX,
    a: CHANNEL_MAX,
  };
}

/**
 * 투명도가 있는 색(0~1)을 0~255로 옮긴다.
 * @param color 피그마 색
 * @returns 0~255 색
 */
function rgba255(color: FigmaRgba): Rgba255 {
  return {
    r: color.r * CHANNEL_MAX,
    g: color.g * CHANNEL_MAX,
    b: color.b * CHANNEL_MAX,
    a: color.a * CHANNEL_MAX,
  };
}
