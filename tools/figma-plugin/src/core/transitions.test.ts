import { describe, expect, it } from 'vitest';

import { type ReactionInput, variantTransitions } from './transitions';

const slugs = new Map([
  ['1:1', 'state=rest'],
  ['1:2', 'state=focused'],
]);

/**
 * 테스트용 반응을 만든다.
 * @param overrides 바꿀 값
 * @returns 반응
 */
function reaction(overrides: Partial<ReactionInput> = {}): ReactionInput {
  return {
    trigger: 'ON_CLICK',
    destinationId: '1:2',
    navigation: 'CHANGE_TO',
    transitionType: 'SMART_ANIMATE',
    duration: 0.167,
    easingType: 'CUSTOM_CUBIC_BEZIER',
    bezier: [0, 0, 0, 1],
    ...overrides,
  };
}

/**
 * 반응 하나의 위반 이유를 모은다.
 * @param input 반응
 * @returns 위반 이유
 */
function reasons(input: ReactionInput): string[] {
  return variantTransitions([input], slugs, 'X').violations.map((item) => item.reason);
}

// @codocs [[피그마 일치 검사:상태 전환]]
describe('변형 사이 전환(M1)', () => {
  it('같은 세트 변형으로 바뀌는 전환의 시간(ms)과 이징(베지어 네 값)을 값 그대로 옮긴다', () => {
    expect(variantTransitions([reaction()], slugs, 'SearchBox / Rest')).toEqual({
      transitions: [
        {
          trigger: 'ON_CLICK',
          to: 'state=focused',
          type: 'SMART_ANIMATE',
          duration: 167,
          easing: [0, 0, 0, 1],
        },
      ],
      violations: [],
    });
  });

  it('피그마 기본 이징은 피그마가 정한 제어점으로 바꾼다', () => {
    /**
     * 기본 이징 하나의 베지어 값을 돌려준다.
     * @param easingType 이징 종류
     * @returns 전환의 이징
     */
    function preset(easingType: string): unknown {
      const result = variantTransitions(
        [reaction({ duration: 0.083, easingType, bezier: null })],
        slugs,
        'Button / Rest',
      );
      return result.transitions[0]?.easing;
    }
    expect(preset('LINEAR')).toEqual([0, 0, 1, 1]);
    expect(preset('EASE_IN')).toEqual([0.42, 0, 1, 1]);
    expect(preset('EASE_OUT')).toEqual([0, 0, 0.58, 1]);
    expect(preset('EASE_IN_AND_OUT')).toEqual([0.42, 0, 0.58, 1]);
  });

  it('직접 정한 베지어는 부동소수 표현 차이만 없애고 그대로 옮긴다', () => {
    const result = variantTransitions(
      [reaction({ bezier: [0.10000000149, 0.9, 0.2, 1.0000001] })],
      slugs,
      'X',
    );
    expect(result.transitions[0]).toMatchObject({ easing: [0.1, 0.9, 0.2, 1] });
  });

  it('스프링 이징은 베지어로 옮길 수 없어 이징을 null로 둔다(판정하지 않음)', () => {
    for (const easingType of ['GENTLE', 'QUICK', 'BOUNCY', 'SLOW', 'CUSTOM_SPRING']) {
      expect(variantTransitions([reaction({ easingType, bezier: null })], slugs, 'X')).toEqual({
        transitions: [
          {
            trigger: 'ON_CLICK',
            to: 'state=focused',
            type: 'SMART_ANIMATE',
            duration: 167,
            easing: null,
          },
        ],
        violations: [],
      });
    }
  });

  it('모션 토큰에 없는 시간·이징도 막지 않는다', () => {
    expect(reasons(reaction({ duration: 0.2, bezier: [0.1, 0, 0, 1] }))).toEqual([]);
  });

  it('CSS로 옮길 수 없는 전환 종류와 읽을 수 없는 이징은 막는다', () => {
    expect(reasons(reaction({ transitionType: 'MOVE_IN' }))).toEqual([
      '전환 종류 MOVE_IN는 코드의 CSS 전환으로 옮길 수 없다',
    ]);
    expect(reasons(reaction({ easingType: 'UNKNOWN', bezier: null }))).toEqual([
      '전환 이징 UNKNOWN을 3차 베지어 값으로 옮길 수 없다',
    ]);
  });

  it('즉시 전환은 시간·이징 없이 담는다', () => {
    expect(
      variantTransitions([reaction({ transitionType: null })], slugs, 'X').transitions,
    ).toEqual([{ trigger: 'ON_CLICK', to: 'state=focused', type: 'INSTANT' }]);
  });

  it('다른 노드로 가는 반응과 오버레이 같은 동작은 담지 않는다', () => {
    expect(
      variantTransitions(
        [reaction({ destinationId: '9:9' }), reaction({ navigation: 'OVERLAY' })],
        slugs,
        'X',
      ),
    ).toEqual({ transitions: [], violations: [] });
  });
});
