// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { VariantChecks } from './layer-checks.ts';
import { incomingTransitions } from './transition-checks.ts';

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
      { layer: '', role: '채우기', figma: fill, classes: [], computed: [] },
      { layer: '', role: '배치 방향', figma: 'HORIZONTAL', classes: [], computed: [] },
    ],
    texts: [],
    assets: [{ layer: 'icon', file: icon, color: null }],
    unsupported: [],
    transitions: [],
  };
}

const variants = {
  'state=rest': {
    transitions: [
      {
        to: 'state=focused',
        trigger: 'ON_CLICK',
        type: 'SMART_ANIMATE',
        duration: 'motion/duration/fast',
        easing: 'motion/easing/direct-entrance',
      },
    ],
  },
  'state=focused': {},
};
const byVariant: Record<string, VariantChecks> = {
  'state=rest': checks('control-fill/default', 'icons/search.svg'),
  'state=focused': checks('control-fill/input-active', 'illustrations/icon-color-search.svg'),
};

// @codocs [[피그마 일치 검사:상태 전환]]
describe('상태 전환 확인 항목(M1)', () => {
  it('도착 변형으로 들어오는 전환에서 바뀌는 역할을 CSS 속성과 모션 토큰 클래스로 바꾼다', () => {
    const result = incomingTransitions('state=focused', variants, (variant) => {
      const found = byVariant[variant];
      if (found === undefined) {
        throw new Error(variant);
      }
      return found;
    });
    expect(result).toEqual([
      {
        from: 'state=rest',
        trigger: 'ON_CLICK',
        layer: '',
        properties: { 'background-color': '채우기' },
        skipped: [],
        unknown: [],
        duration: {
          figma: 'motion/duration/fast',
          className: 'duration-fast',
          css: 'var(--motion-duration-fast)',
        },
        easing: {
          figma: 'motion/easing/direct-entrance',
          className: 'ease-direct-entrance',
          css: 'var(--motion-easing-direct-entrance)',
        },
      },
      expect.objectContaining({ layer: 'icon', properties: {}, skipped: ['자산'] }),
    ]);
  });

  it('출발 변형이 아닌 변형에는 들어오는 전환이 없다', () => {
    expect(incomingTransitions('state=rest', variants, () => checks('a', 'b'))).toEqual([]);
  });
});
