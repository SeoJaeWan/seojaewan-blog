import type { JsonObject } from '../stable-json';
import type { Violation } from './check-structure';

// M1: 컴포넌트 변형 사이의 프로토타입 전환(유무, 시간, 이징)을 이름 정보로 옮긴다.
// 피그마 반응은 변수에 연결할 수 없어 이름으로 비교할 수 없으므로, 시간(ms)과 이징(3차 베지어 네 값)을 값 그대로 내보낸다.
// 값으로 모션 토큰 이름을 짐작하지 않는다.

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

/** 스프링 이징. CSS 3차 베지어로 옮길 수 없어 이징을 null로 두고 판정하지 않는다 */
const springEasings = new Set(['GENTLE', 'QUICK', 'BOUNCY', 'SLOW', 'CUSTOM_SPRING']);

/** CSS 전환으로 옮길 수 있는 피그마 전환 종류 */
const supportedTransitions = new Set(['SMART_ANIMATE', 'DISSOLVE']);

/**
 * 변형의 반응을 전환 정보로 옮긴다. 같은 컴포넌트 세트의 다른 변형으로 바뀌는(CHANGE_TO) 반응만 담는다.
 * 시간은 ms, 이징은 3차 베지어 네 값(`[x1, y1, x2, y2]`)이다. 피그마 기본 이징은 그 제어점으로 바꾸고,
 * 스프링 이징은 베지어로 옮길 수 없어 null(판정하지 않음)로 둔다. 즉시 전환은 움직임이 없어 시간·이징 없이 담는다.
 * CSS로 옮길 수 없는 전환 종류, 읽을 수 없는 시간·이징은 위반이다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param reactions 변형의 반응
 * @param variantSlugs 같은 세트의 변형 ID → 변형 파일 이름
 * @param where 위반 위치
 * @returns 전환 목록과 위반
 */
export function variantTransitions(
  reactions: readonly ReactionInput[],
  variantSlugs: ReadonlyMap<string, string>,
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
    const easing = easingPoints(reaction);
    if (reaction.duration === null) {
      violations.push({
        where: label,
        reason: '전환 시간을 읽을 수 없다',
        fix: '전환 시간을 정한다.',
      });
    }
    if (easing === undefined) {
      violations.push({
        where: label,
        reason: `전환 이징 ${reaction.easingType ?? '없음'}을 3차 베지어 값으로 옮길 수 없다`,
        fix: '기본 이징, 3차 베지어, 스프링 이징 중 하나로 정한다.',
      });
    }
    if (reaction.duration !== null && easing !== undefined) {
      transitions.push({
        trigger: reaction.trigger,
        to,
        type: reaction.transitionType,
        duration: Math.round(reaction.duration * 1000),
        easing: easing === null ? null : [...easing],
      });
    }
  }
  return { transitions, violations };
}

/**
 * 이징을 3차 베지어 제어점으로 바꾼다. 기본 이징은 그 제어점(LINEAR는 `[0, 0, 1, 1]`)이고,
 * 부동소수 표현 차이만 없애도록 소수 넷째 자리에서 반올림한다.
 * @param reaction 반응
 * @returns 제어점 4개, 스프링이면 null, 옮길 수 없으면 undefined
 */
function easingPoints(reaction: ReactionInput): readonly number[] | null | undefined {
  if (springEasings.has(reaction.easingType ?? '')) {
    return null;
  }
  const points =
    reaction.easingType === 'CUSTOM_CUBIC_BEZIER'
      ? reaction.bezier
      : (presetEasings[reaction.easingType ?? ''] ?? null);
  if (points?.length !== 4) {
    return undefined;
  }
  return points.map((value) => Number(value.toFixed(4)));
}
