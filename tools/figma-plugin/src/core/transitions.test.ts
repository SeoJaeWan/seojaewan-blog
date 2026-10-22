import { describe, expect, it } from 'vitest';

import { bezierKey, type MotionScale, type ReactionInput, variantTransitions } from './transitions';

const scale: MotionScale = {
  durations: new Map([
    [83, ['motion/duration/faster']],
    [167, ['motion/duration/fast']],
  ]),
  easings: new Map([
    [bezierKey([0, 0, 1, 1]), ['motion/easing/fade']],
    [bezierKey([0, 0, 0, 1]), ['motion/easing/direct-entrance']],
  ]),
};
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
  return variantTransitions([input], slugs, scale, 'X').violations.map((item) => item.reason);
}

// @codocs [[피그마 일치 검사:상태 전환]]
describe('변형 사이 전환(M1)', () => {
  it('같은 세트 변형으로 바뀌는 전환의 시간·이징을 모션 토큰 이름으로 옮긴다', () => {
    expect(variantTransitions([reaction()], slugs, scale, 'SearchBox / Rest')).toEqual({
      transitions: [
        {
          trigger: 'ON_CLICK',
          to: 'state=focused',
          type: 'SMART_ANIMATE',
          duration: 'motion/duration/fast',
          easing: 'motion/easing/direct-entrance',
        },
      ],
      violations: [],
    });
  });

  it('피그마 기본 이징(LINEAR)은 제어점으로 바꿔 찾는다', () => {
    const result = variantTransitions(
      [reaction({ duration: 0.083, easingType: 'LINEAR', bezier: null })],
      slugs,
      scale,
      'Button / Rest',
    );
    expect(result.transitions[0]).toMatchObject({
      duration: 'motion/duration/faster',
      easing: 'motion/easing/fade',
    });
  });

  it('토큰에 없는 시간·이징과 CSS로 옮길 수 없는 전환 종류는 막는다', () => {
    expect(reasons(reaction({ duration: 0.2 }))).toEqual([
      '전환 시간 200ms가 모션 토큰(motion/duration/*)에 없다',
    ]);
    expect(reasons(reaction({ bezier: [0.1, 0, 0, 1] }))).toEqual([
      '전환 이징 CUSTOM_CUBIC_BEZIER이 모션 토큰(motion/easing/*)에 없다',
    ]);
    expect(reasons(reaction({ transitionType: 'MOVE_IN' }))).toEqual([
      '전환 종류 MOVE_IN는 코드의 CSS 전환으로 옮길 수 없다',
    ]);
  });

  it('다른 노드로 가는 반응과 오버레이 같은 동작은 담지 않는다', () => {
    expect(
      variantTransitions(
        [reaction({ destinationId: '9:9' }), reaction({ navigation: 'OVERLAY' })],
        slugs,
        scale,
        'X',
      ),
    ).toEqual({ transitions: [], violations: [] });
  });
});
