// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { type TokenNames, variantChecks } from './layer-checks.ts';

const tokens: TokenNames = {
  variables: new Set([
    '--color-accent-fill-default',
    '--color-text-fill-primary',
    '--spacing-6',
    '--spacing-8',
    '--spacing-12',
    '--spacing-icon-16',
    '--radius-control',
  ]),
  utilities: new Set(['type-body']),
  textUtilities: new Map([
    [
      'type-body',
      {
        fontFamily: 'font/family/base',
        fontSize: 'font/size/body',
        fontWeight: 'font/weight/regular',
        lineHeight: 'font/line-height/body',
        letterSpacing: '{"unit":"%","value":0}',
      },
    ],
  ]),
};

const root = {
  path: '',
  type: 'COMPONENT',
  parentLayout: null,
  fill: { variable: 'accent-fill/default' },
  layout: {
    mode: 'HORIZONTAL',
    primaryAlign: 'CENTER',
    counterAlign: 'CENTER',
    gap: 'spacing/8',
    counterGap: null,
    wrap: 'NO_WRAP',
    padding: { top: 'spacing/6', right: 'spacing/12', bottom: 'spacing/6', left: 'spacing/12' },
  },
  radius: {
    topLeft: 'radius/control',
    topRight: 'radius/control',
    bottomRight: 'radius/control',
    bottomLeft: 'radius/control',
  },
  sizing: { horizontal: 'HUG', vertical: 'HUG' },
};

const icon = {
  path: 'icon',
  type: 'INSTANCE',
  parentLayout: 'HORIZONTAL',
  asset: { file: 'icons/add.svg', kind: 'mono', color: 'text-fill/primary' },
  sizing: { horizontal: 'FIXED', vertical: 'FIXED', width: 'size/icon/16', height: 'size/icon/16' },
};

const label = {
  path: 'label',
  type: 'TEXT',
  parentLayout: 'HORIZONTAL',
  sizing: { horizontal: 'HUG', vertical: 'HUG' },
  text: {
    characters: '버튼',
    alignHorizontal: 'LEFT',
    alignVertical: 'TOP',
    autoResize: 'WIDTH_AND_HEIGHT',
    maxLines: null,
    segments: [
      {
        start: 0,
        end: 2,
        fontFamily: 'Pretendard',
        textStyle: 'Hangul/Body',
        textDecoration: 'NONE',
        fill: { variable: 'text-fill/primary' },
        style: {
          fontSize: { variable: 'font/size/body' },
          fontWeight: { variable: 'font/weight/regular' },
          lineHeight: { variable: 'font/line-height/body' },
          letterSpacing: { value: '0%' },
        },
      },
    ],
  },
};

/**
 * 역할의 클래스 후보를 찾는다.
 * @param layers 레이어 목록
 * @param layer 레이어 경로
 * @param role 역할
 * @returns 클래스 후보(없으면 undefined)
 */
function classesOf(layers: readonly unknown[], layer: string, role: string): unknown {
  return variantChecks(layers, [], tokens).checks.find(
    (check) => check.layer === layer && check.role === role,
  )?.classes;
}

// @codocs [[피그마 일치 검사:비교 규칙]]
describe('레이어 확인 항목', () => {
  it('변수 이름으로 역할마다 클래스 이름을 정한다', () => {
    const layers = [root];
    expect(classesOf(layers, '', '채우기')).toEqual([['bg-accent-fill-default']]);
    expect(classesOf(layers, '', '여백(right)')).toEqual([['pr-12', 'px-12', 'p-12']]);
    expect(classesOf(layers, '', '간격')).toEqual([['gap-8', 'gap-x-8']]);
    expect(classesOf(layers, '', '주축 정렬')).toEqual([['justify-center']]);
  });

  it('자산은 파일 이름과 색 클래스를 확인한다', () => {
    const checks = variantChecks([root, icon], [], tokens);
    expect(checks.assets).toEqual([
      {
        layer: 'icon',
        file: 'icons/add.svg',
        color: {
          figma: 'text-fill/primary',
          classes: ['text-text-fill-primary'],
          css: 'var(--color-text-fill-primary)',
        },
      },
    ]);
    expect(classesOf([root, icon], 'icon', '너비')).toEqual([['w-icon-16', 'size-icon-16']]);
  });

  it('글자 스타일은 이름이 아니라 연결 변수로 type-* 유틸리티를 찾는다(D2)', () => {
    const [text] = variantChecks([root, label], [], tokens).texts;
    expect(text?.characters).toBe('버튼');
    expect(text?.segments[0]?.typeClasses).toEqual(['type-body']);
    expect(text?.segments[0]?.fontFamily).toBe('Pretendard');
  });

  it('숨긴 레이어는 그대로 넘긴다(D4)', () => {
    expect(variantChecks([root], ['icon'], tokens).hidden).toEqual(['icon']);
  });

  it('변수에 연결되지 않은 값은 비교할 수 없음으로 남긴다', () => {
    const unbound = { ...root, fill: { value: '#ffffff' } };
    const checks = variantChecks([unbound], [], tokens);
    expect(checks.unsupported.map((item) => item.layer)).toEqual(['']);
  });
});
