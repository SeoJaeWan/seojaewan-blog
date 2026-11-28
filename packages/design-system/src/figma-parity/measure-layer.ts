import type { MotionTimelineLayout, MotionTrackLayout } from '../figma-export/component-layout';
import type { MotionValue } from '../figma-export/component-schema';
import type { LayerKey } from '../figma-export/layer-key';
import type { Mismatch, ObservedLayer } from './compare-layout';

// 브라우저가 그린 요소에서 견줄 값을 읽는다. 스토리 테스트(실제 Chromium)에서만 부른다.

/** 키프레임 위치의 허용 오차(0~1) */
const OFFSET_TOLERANCE = 0.001;

/** 키프레임 값의 허용 오차 */
const VALUE_TOLERANCE = 0.01;

/**
 * 요소 하나에서 견줄 값을 읽는다. 자리는 스토리 루트(컴포넌트 루트 요소) 기준이다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param element 레이어를 그린 요소
 * @param origin 컴포넌트 루트 요소의 자리
 * @returns 브라우저가 계산한 값
 */
export function observeLayer(element: Element, origin: DOMRect): ObservedLayer {
  const style = getComputedStyle(element);
  const ring = getComputedStyle(element, '::before');
  const rect = element.getBoundingClientRect();
  /**
   * px 값을 숫자로 읽는다.
   * @param value 계산된 값
   * @returns 숫자. 읽지 못하면 0
   */
  function px(value: string): number {
    const number = Number.parseFloat(value);
    return Number.isNaN(number) ? 0 : number;
  }
  return {
    rect: {
      x: rect.left - origin.left,
      y: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
    },
    opacity: Number.parseFloat(style.opacity),
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    color: style.color,
    border: {
      top: {
        width: borderWidth(style.borderTopStyle, style.borderTopWidth),
        color: style.borderTopColor,
      },
      right: {
        width: borderWidth(style.borderRightStyle, style.borderRightWidth),
        color: style.borderRightColor,
      },
      bottom: {
        width: borderWidth(style.borderBottomStyle, style.borderBottomWidth),
        color: style.borderBottomColor,
      },
      left: {
        width: borderWidth(style.borderLeftStyle, style.borderLeftWidth),
        color: style.borderLeftColor,
      },
    },
    outline: {
      style: style.outlineStyle,
      width: px(style.outlineWidth),
      color: style.outlineColor,
      offset: px(style.outlineOffset),
    },
    ring: {
      content: ring.content,
      width: px(ring.paddingTop),
      backgroundColor: ring.backgroundColor,
      backgroundImage: ring.backgroundImage,
    },
    radius: {
      topLeft: px(style.borderTopLeftRadius),
      topRight: px(style.borderTopRightRadius),
      bottomRight: px(style.borderBottomRightRadius),
      bottomLeft: px(style.borderBottomLeftRadius),
    },
    boxShadow: style.boxShadow,
    textShadow: style.textShadow,
    fontSize: px(style.fontSize),
    lineHeight: style.lineHeight,
    fontWeight: Number.parseFloat(style.fontWeight),
    objectFit: style.objectFit,
    asset: assetOf(element),
  };
}

/**
 * 테두리 두께를 읽는다. 테두리 모양이 없으면 두께가 있어도 그리지 않는다.
 * @param borderStyle 계산된 `border-*-style`
 * @param width 계산된 `border-*-width`
 * @returns 두께(px)
 */
function borderWidth(borderStyle: string, width: string): number {
  return borderStyle === 'none' || borderStyle === 'hidden' ? 0 : Number.parseFloat(width) || 0;
}

/**
 * 자산 요소의 모양을 읽는다. SVG는 viewBox와 첫 요소의 `d`, 이미지는 주소다.
 * @param element 요소
 * @returns 자산 모양. 자산 요소가 아니면 null
 */
function assetOf(element: Element): ObservedLayer['asset'] {
  if (element instanceof SVGSVGElement) {
    return {
      viewBox: element.getAttribute('viewBox'),
      firstPath: element.firstElementChild?.getAttribute('d') ?? null,
      src: null,
    };
  }
  if (element instanceof HTMLImageElement) {
    return { viewBox: null, firstPath: null, src: element.getAttribute('src') };
  }
  return null;
}

/**
 * 움직임을 견준다. 트랙마다 그 요소의 CSS 애니메이션을 찾아 시간, 반복, 키프레임 위치·값·이징을 본다.
 * 이징은 곡선 숫자가 있거나 선형일 때만 견준다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:모션]]
 * @param timelines 검증 자료의 움직임
 * @param elementOf 트랙이 걸린 요소를 찾는다
 * @returns 다른 값
 */
export function compareMotion(
  timelines: readonly MotionTimelineLayout[],
  elementOf: (layer: LayerKey, assetLayer: string | null) => Element | null,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  for (const timeline of timelines) {
    for (const track of timeline.tracks) {
      const field = `motion.${track.property}`;
      /**
       * 다른 값을 더한다.
       * @param detail 항목 뒤에 붙일 것
       * @param expected 피그마 값
       * @param actual 브라우저 값
       */
      function add(detail: string, expected: string, actual: string): void {
        mismatches.push({ layer: track.layer, field: `${field}${detail}`, expected, actual });
      }
      const element = elementOf(track.layer, track.assetLayer);
      if (element === null) {
        add('', '움직이는 요소', '요소 없음');
        continue;
      }
      const property = cssPropertyOf(track.property);
      const animation = element
        .getAnimations()
        .find(
          (candidate) =>
            candidate.effect instanceof KeyframeEffect &&
            candidate.effect.getKeyframes().some((frame) => property in frame),
        );
      const effect = animation?.effect;
      if (!(effect instanceof KeyframeEffect)) {
        add('', `${property} 애니메이션`, '없음');
        continue;
      }
      const timing = effect.getTiming();
      if (Number(timing.duration) !== timeline.durationMs) {
        add('.duration', `${String(timeline.durationMs)}ms`, `${String(timing.duration)}ms`);
      }
      const iterations = timeline.isLooping ? Number.POSITIVE_INFINITY : 1;
      if (timing.iterations !== iterations) {
        add('.iterations', String(iterations), String(timing.iterations));
      }
      compareKeyframes(track, timeline, effect.getKeyframes(), property, add);
    }
  }
  return mismatches;
}

/**
 * 트랙의 키프레임과 CSS 키프레임을 견준다.
 * @param track 검증 자료의 트랙
 * @param timeline 타임라인
 * @param frames CSS 키프레임
 * @param property CSS 속성(`getKeyframes()`의 키)
 * @param add 다른 값을 더한다
 */
function compareKeyframes(
  track: MotionTrackLayout,
  timeline: MotionTimelineLayout,
  frames: readonly ComputedKeyframe[],
  property: string,
  add: (detail: string, expected: string, actual: string) => void,
): void {
  for (const [index, keyframe] of track.keyframes.entries()) {
    const offset = timeline.durationMs === 0 ? 0 : keyframe.offsetMs / timeline.durationMs;
    const frame = frames.find(
      (candidate) => Math.abs(candidate.computedOffset - offset) <= OFFSET_TOLERANCE,
    );
    const at = `[${String(Math.round(offset * 1000) / 10)}%]`;
    if (frame === undefined) {
      add(at, '키프레임', '없음');
      continue;
    }
    const expected = expectedNumbers(track, index);
    const actual = completeComponents(property, cssNumbers(String(frame[property] ?? '')));
    if (
      expected.length > 0 &&
      !expected.every(
        (value, position) => Math.abs(value - (actual[position] ?? Number.NaN)) <= VALUE_TOLERANCE,
      )
    ) {
      add(at, expected.join(' '), String(frame[property] ?? ''));
    }
    const next = track.keyframes[index + 1];
    if (next !== undefined) {
      const easing = next.easing;
      const expectedEasing =
        easing.bezier === null
          ? easing.type === 'LINEAR'
            ? 'linear'
            : null
          : `cubic-bezier(${[easing.bezier.x1, easing.bezier.y1, easing.bezier.x2, easing.bezier.y2].join(', ')})`;
      if (expectedEasing !== null && !isSameEasing(expectedEasing, frame.easing)) {
        add(`${at}.easing`, expectedEasing, frame.easing);
      }
    }
  }
}

/**
 * 두 이징 글의 숫자가 같은지 본다.
 * @param expected 기대 이징
 * @param actual 브라우저 이징
 * @returns 같으면 true
 */
function isSameEasing(expected: string, actual: string): boolean {
  if (expected === 'linear') {
    return actual === 'linear';
  }
  const a = cssNumbers(expected);
  const b = cssNumbers(actual);
  return (
    actual.startsWith('cubic-bezier') &&
    a.every((value, index) => Math.abs(value - (b[index] ?? Number.NaN)) <= 1e-3)
  );
}

/**
 * 트랙 키프레임 하나에서 CSS가 가져야 할 숫자를 구한다. 연산(`OFFSET`, `SCALE`)은 기본값에 푼다.
 * 선 그리기 끝은 `stroke-dasharray`의 첫 숫자(끝-시작), 시작은 `stroke-dashoffset`(-시작)이다.
 * @param track 트랙
 * @param index 키프레임 순서
 * @returns 숫자
 */
function expectedNumbers(track: MotionTrackLayout, index: number): number[] {
  const value = track.keyframes[index]?.value ?? track.baseValue;
  const resolved = resolveValue(track, value);
  switch (track.property) {
    case 'SCALE_X':
      return [resolved[0] ?? 1, 1];
    case 'SCALE_Y':
      return [1, resolved[0] ?? 1];
    case 'TRANSLATION_X':
      return [resolved[0] ?? 0, 0];
    case 'TRANSLATION_Y':
      return [0, resolved[0] ?? 0];
    case 'PATH_TRIM_START':
      return [-(resolved[0] ?? 0)];
    case 'PATH_TRIM_END':
      return [];
    default:
      return resolved;
  }
}

/**
 * 키프레임 값을 연산에 따라 푼다.
 * @param track 트랙
 * @param value 키프레임 값
 * @returns 숫자(x, y 또는 하나)
 */
function resolveValue(track: MotionTrackLayout, value: MotionValue): number[] {
  const base = track.baseValue;
  const values = typeof value === 'number' ? [value] : [value.x, value.y];
  const bases = typeof base === 'number' ? [base] : [base.x, base.y];
  return values.map(
    /**
     * 성분 하나에 연산을 푼다.
     * @param item 성분 값
     * @param position 성분 순서
     */
    (item, position) => {
      const baseValue = bases[position] ?? 0;
      if (track.operation === 'OFFSET') {
        return baseValue + item;
      }
      return track.operation === 'SCALE' ? baseValue * item : item;
    },
  );
}

/**
 * 키프레임 항목의 CSS 속성(`getKeyframes()` 키)을 정한다.
 * @param property 피그마 항목
 * @returns CSS 속성 키
 */
function cssPropertyOf(property: MotionTrackLayout['property']): string {
  if (property === 'OPACITY') {
    return 'opacity';
  }
  if (property.startsWith('SCALE')) {
    return 'scale';
  }
  if (property.startsWith('TRANSLATION')) {
    return 'translate';
  }
  if (property === 'ROTATION') {
    return 'rotate';
  }
  return property === 'PATH_TRIM_START' ? 'strokeDashoffset' : 'strokeDasharray';
}

/**
 * 계산된 값이 줄여 쓴 성분을 채운다. `translate`는 y가 0이면 x만, `scale`은 x와 y가 같으면 하나만 쓴다.
 * @param property CSS 속성 키
 * @param numbers 읽은 숫자
 * @returns 성분을 모두 채운 숫자
 */
function completeComponents(property: string, numbers: readonly number[]): number[] {
  if (numbers.length !== 1) {
    return [...numbers];
  }
  const [value = 0] = numbers;
  if (property === 'translate') {
    return [value, 0];
  }
  return property === 'scale' ? [value, value] : [value];
}

/**
 * CSS 값의 숫자를 읽는다. `var(--이름, 기본값)`은 기본값만 읽는다.
 * @param css CSS 값
 * @returns 숫자
 */
function cssNumbers(css: string): number[] {
  const text = css.replace(/var\(--[\w-]+,/gu, '');
  return [...text.matchAll(/-?[0-9]*\.?[0-9]+(?:e-?[0-9]+)?/gu)].map((match) => Number(match[0]));
}
