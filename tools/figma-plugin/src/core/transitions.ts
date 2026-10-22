import type { JsonObject } from '../stable-json';
import type { Violation } from './check-structure';

// M1: 컴포넌트 변형 사이의 프로토타입 전환(유무, 시간, 이징)을 이름 정보로 옮긴다.
// 시간과 이징은 값으로 모션 토큰(motion/duration/*, motion/easing/*) 이름을 찾는다. 피그마 반응은 변수에
// 연결할 수 없어 값으로 찾는다. 토큰에 없는 값은 막는다.

/** 피그마 반응 하나에서 쓰는 값만 옮긴 모양(figma-reader가 피그마 Reaction에서 만든다) */
export type ReactionInput = {
  trigger: string;
  /** 이동할 노드 ID(NODE 동작이 아니면 null) */
  destinationId: string | null;
  /** NODE 동작의 navigation(CHANGE_TO 등). 다른 동작이면 동작 종류 */
  navigation: string;
  /** 전환 종류(SMART_ANIMATE, DISSOLVE 등). 즉시 전환이면 null */
  transitionType: string | null;
  /** 초 단위 시간 */
  duration: number | null;
  /** 이징 종류(LINEAR, EASE_OUT, CUSTOM_CUBIC_BEZIER 등) */
  easingType: string | null;
  /** CUSTOM_CUBIC_BEZIER의 제어점 */
  bezier: readonly number[] | null;
};

/** 모션 토큰 값 표 */
export type MotionScale = {
  /** ms 값 → motion/duration/* 이름 */
  durations: ReadonlyMap<number, readonly string[]>;
  /** `x1,y1,x2,y2` → motion/easing/* 이름 */
  easings: ReadonlyMap<string, readonly string[]>;
};

/** 피그마 기본 이징의 3차 베지어 제어점 */
const presetEasings: Readonly<Record<string, readonly number[]>> = {
  LINEAR: [0, 0, 1, 1],
  EASE_IN: [0.42, 0, 1, 1],
  EASE_OUT: [0, 0, 0.58, 1],
  EASE_IN_AND_OUT: [0.42, 0, 0.58, 1],
  EASE_IN_BACK: [0.3, -0.05, 0.7, -0.5],
  EASE_OUT_BACK: [0.45, 1.45, 0.8, 1],
  EASE_IN_AND_OUT_BACK: [0.7, -0.4, 0.4, 1.4],
};

/** CSS 전환으로 옮길 수 있는 피그마 전환 종류 */
const supportedTransitions = new Set(['SMART_ANIMATE', 'DISSOLVE']);

/**
 * 변형의 반응을 전환 정보로 옮긴다. 같은 컴포넌트 세트의 다른 변형으로 바뀌는(CHANGE_TO) 반응만 담는다.
 * 시간·이징을 모션 토큰 이름으로 찾지 못하거나, CSS로 옮길 수 없는 전환 종류면 위반이다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param reactions 변형의 반응
 * @param variantSlugs 같은 세트의 변형 ID → 변형 파일 이름
 * @param scale 모션 토큰 값 표
 * @param where 위반 위치
 * @returns 전환 목록과 위반
 */
export function variantTransitions(
  reactions: readonly ReactionInput[],
  variantSlugs: ReadonlyMap<string, string>,
  scale: MotionScale,
  where: string,
): { transitions: JsonObject[]; violations: Violation[] } {
  const transitions: JsonObject[] = [];
  const violations: Violation[] = [];
  for (const reaction of reactions) {
    if (reaction.navigation !== 'CHANGE_TO' || reaction.destinationId === null) {
      continue;
    }
    const to = variantSlugs.get(reaction.destinationId);
    if (to === undefined) {
      continue;
    }
    const label = `${where} → ${to} (${reaction.trigger})`;
    if (reaction.transitionType === null) {
      transitions.push({ trigger: reaction.trigger, to, type: 'INSTANT' });
      continue;
    }
    if (!supportedTransitions.has(reaction.transitionType)) {
      violations.push({
        where: label,
        reason: `전환 종류 ${reaction.transitionType}는 코드의 CSS 전환으로 옮길 수 없다`,
        fix: 'Smart Animate나 Dissolve로 바꾼다.',
      });
      continue;
    }
    const duration = durationToken(reaction.duration, scale);
    const easing = easingToken(reaction, scale);
    if (duration === undefined) {
      violations.push({
        where: label,
        reason: `전환 시간 ${formatMs(reaction.duration)}ms가 모션 토큰(motion/duration/*)에 없다`,
        fix: '토큰에 있는 시간으로 바꾸거나 Foundations에 모션 시간 토큰을 추가한다.',
      });
    }
    if (easing === undefined) {
      violations.push({
        where: label,
        reason: `전환 이징 ${reaction.easingType ?? '없음'}이 모션 토큰(motion/easing/*)에 없다`,
        fix: '토큰에 있는 이징 값(3차 베지어)으로 바꾸거나 Foundations에 모션 이징 토큰을 추가한다.',
      });
    }
    if (duration !== undefined && easing !== undefined) {
      transitions.push({
        trigger: reaction.trigger,
        to,
        type: reaction.transitionType,
        duration,
        easing,
      });
    }
  }
  return { transitions, violations };
}

/**
 * 시간에 맞는 모션 시간 토큰을 찾는다. 피그마 값은 초, 토큰은 ms이고 반올림해 비교한다.
 * @param seconds 초 단위 시간
 * @param scale 모션 토큰 값 표
 * @returns 토큰 이름(하나로 정해지지 않으면 undefined)
 */
function durationToken(seconds: number | null, scale: MotionScale): string | undefined {
  if (seconds === null) {
    return undefined;
  }
  const names = scale.durations.get(Math.round(seconds * 1000));
  return names?.length === 1 ? names[0] : undefined;
}

/**
 * 이징에 맞는 모션 이징 토큰을 찾는다. 기본 이징은 그 제어점으로 바꿔 찾는다.
 * @param reaction 반응
 * @param scale 모션 토큰 값 표
 * @returns 토큰 이름(하나로 정해지지 않으면 undefined)
 */
function easingToken(reaction: ReactionInput, scale: MotionScale): string | undefined {
  const points =
    reaction.easingType === 'CUSTOM_CUBIC_BEZIER'
      ? reaction.bezier
      : (presetEasings[reaction.easingType ?? ''] ?? null);
  if (points === null || points.length !== 4) {
    return undefined;
  }
  const names = scale.easings.get(bezierKey(points));
  return names?.length === 1 ? names[0] : undefined;
}

/**
 * 3차 베지어 제어점을 표 열쇠로 바꾼다(소수 넷째 자리까지).
 * @param points 제어점 4개
 * @returns `x1,y1,x2,y2`
 */
export function bezierKey(points: readonly number[]): string {
  return points.map((value) => String(Number(value.toFixed(4)))).join(',');
}

/**
 * 초를 ms 문자열로 쓴다.
 * @param seconds 초
 * @returns ms 문자열
 */
function formatMs(seconds: number | null): string {
  return seconds === null ? '없음' : String(Math.round(seconds * 1000));
}
