// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { readFigmaTokens } from './figma-tokens.ts';
import type { VariantChecks } from './layer-checks.ts';
import { incomingTransitions } from './transition-checks.ts';

const tokens = readFigmaTokens({
  motion: {
    duration: { fast: { $type: 'duration', $value: { unit: 'ms', value: 167 } } },
    easing: { 'direct-entrance': { $type: 'cubicBezier', $value: [0, 0, 0, 1] } },
  },
});

/**
 * 테스트용 확인 항목을 만든다.
 * @param fill 루트 채우기 변수
 * @param icon 아이콘 자산 파일
 * @returns 확인 항목
 */
function checks(fill: string, icon: string): VariantChecks {
  return {
    layers: ['', 'icon'],
    slots: [],
    hidden: [],
    checks: [
      { layer: '', role: '채우기', figma: fill, property: 'background-color' },
      { layer: '', role: '배치 방향', figma: 'HORIZONTAL', property: 'flex-direction' },
    ],
    texts: [],
    assets: [{ layer: 'icon', file: icon, color: null }],
    unsupported: [],
    transitions: [],
  };
}

const byVariant: Record<string, VariantChecks> = {
  'state=rest': checks('control-fill/default', 'icons/search.svg'),
  'state=focused': checks('control-fill/input-active', 'illustrations/icon-color-search.svg'),
};

/**
 * 변형 이름으로 확인 항목을 찾는다.
 * @param variant 변형 이름
 * @returns 확인 항목
 */
function checksOf(variant: string): VariantChecks {
  const found = byVariant[variant];
  if (found === undefined) {
    throw new Error(variant);
  }
  return found;
}

/**
 * Rest → Focused 전환 하나를 가진 변형 표를 만든다.
 * @param transition 전환 항목에서 바꿀 칸
 * @returns 변형 이름 → export.json 변형 항목
 */
function variantsWith(transition: Record<string, unknown>): Record<string, unknown> {
  return {
    'state=rest': {
      transitions: [
        { to: 'state=focused', trigger: 'ON_CLICK', type: 'SMART_ANIMATE', ...transition },
      ],
    },
    'state=focused': {},
  };
}

// @codocs [[피그마 일치 검사:상태 전환]]
describe('상태 전환 확인 항목(M1)', () => {
  it('도착 변형으로 들어오는 전환에서 바뀌는 역할의 CSS 속성과 시간·이징 값을 만든다', () => {
    const variants = variantsWith({ duration: 167, easing: [0, 0, 0, 1] });
    expect(incomingTransitions('state=focused', variants, checksOf, tokens)).toEqual([
      {
        from: 'state=rest',
        trigger: 'ON_CLICK',
        layer: '',
        properties: { 'background-color': '채우기' },
        duration: 167,
        easing: [0, 0, 0, 1],
      },
    ]);
  });

  it('예전 내보내기의 모션 토큰 이름은 tokens.json 값으로 푼다', () => {
    const variants = variantsWith({
      duration: 'motion/duration/fast',
      easing: 'motion/easing/direct-entrance',
    });
    const [transition] = incomingTransitions('state=focused', variants, checksOf, tokens);
    expect(transition?.duration).toBe(167);
    expect(transition?.easing).toEqual([0, 0, 0, 1]);
  });

  it('스프링 이징(null)은 이징을 판정하지 않는다', () => {
    const variants = variantsWith({ duration: 167, easing: null });
    expect(incomingTransitions('state=focused', variants, checksOf, tokens)[0]?.easing).toBeNull();
  });

  it('즉시 전환(시간 없음)과 출발 변형이 아닌 변형에는 확인 항목이 없다', () => {
    expect(incomingTransitions('state=focused', variantsWith({}), checksOf, tokens)).toEqual([]);
    const variants = variantsWith({ duration: 167, easing: [0, 0, 0, 1] });
    expect(incomingTransitions('state=rest', variants, checksOf, tokens)).toEqual([]);
  });
});
