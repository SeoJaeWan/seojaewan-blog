// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { readFigmaTokens } from './figma-tokens.ts';
import { type PropertyCheck, variantChecks } from './layer-checks.ts';

const tokens = readFigmaTokens({
  color: {
    blue: { 'dark-1': { $type: 'color', $value: '#005fb8' } },
    gray: { '1a': { $type: 'color', $value: '#1a1a1a' } },
  },
  'accent-fill': { default: { $type: 'color', $value: '{color.blue.dark-1}' } },
  'text-fill': { primary: { $type: 'color', $value: '{color.gray.1a}' } },
  spacing: {
    '6': { $type: 'dimension', $value: { unit: 'px', value: 6 } },
    '8': { $type: 'dimension', $value: { unit: 'px', value: 8 } },
    '12': { $type: 'dimension', $value: { unit: 'px', value: 12 } },
  },
  size: { icon: { '16': { $type: 'dimension', $value: { unit: 'px', value: 16 } } } },
  radius: { control: { $type: 'dimension', $value: { unit: 'px', value: 4 } } },
  opacity: { cut: { $type: 'number', $value: 50 } },
  font: {
    size: { body: { $type: 'dimension', $value: { unit: 'px', value: 14 } } },
    'line-height': { body: { $type: 'dimension', $value: { unit: 'px', value: 20 } } },
    weight: { regular: { $type: 'fontWeight', $value: 400 } },
  },
  style: {
    effect: {
      Surface: {
        'Flyout (Acrylic)': {
          $type: 'shadow',
          $value: [
            {
              color: '#00000024',
              offsetX: { unit: 'px', value: 0 },
              offsetY: { unit: 'px', value: 8 },
              blur: { unit: 'px', value: 16 },
              spread: { unit: 'px', value: 0 },
              inset: false,
            },
          ],
          $extensions: { 'com.seojaewan': { backgroundBlur: '{blur.acrylic}' } },
        },
      },
    },
    paint: {},
    text: {},
  },
});

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
          letterSpacing: { value: '2%' },
        },
      },
    ],
  },
};

/**
 * 레이어의 역할 확인 항목을 찾는다.
 * @param layers 레이어 목록
 * @param layer 레이어 경로
 * @param role 역할
 * @returns 확인 항목(없으면 undefined)
 */
function checkOf(
  layers: readonly unknown[],
  layer: string,
  role: string,
): PropertyCheck | undefined {
  return variantChecks(layers, [], tokens).checks.find(
    (check) => check.layer === layer && check.role === role,
  );
}

// @codocs [[피그마 일치 검사:판정 항목]]
describe('레이어 확인 항목', () => {
  it('변수가 있는 속성은 이름(CSS 변수)과 값(tokens.json 값 변환)을 모두 본다', () => {
    expect(checkOf([root], '', '채우기')).toEqual({
      layer: '',
      role: '채우기',
      figma: 'accent-fill/default',
      property: 'background-color',
      variables: ['--color-accent-fill-default'],
      expected: { kind: 'color', rgba: [0, 95, 184, 255] },
    });
    expect(checkOf([root], '', '여백(right)')).toMatchObject({
      property: 'padding-right',
      variables: ['--spacing-12'],
      expected: { kind: 'length', px: 12 },
    });
    expect(checkOf([root], '', '간격')).toMatchObject({ property: 'column-gap' });
  });

  it('선택지는 같은 뜻의 CSS 값 목록으로 대응시킨다', () => {
    expect(checkOf([root], '', '주축 정렬')?.expected).toEqual({
      kind: 'keywords',
      values: ['center'],
    });
    expect(checkOf([root], '', '자동 배치')?.expected).toEqual({
      kind: 'keywords',
      values: ['flex', 'inline-flex'],
    });
  });

  it('피그마에 값이 없으면 코드도 없어야 한다(선, 효과, 불투명도)', () => {
    expect(checkOf([root], '', '바깥 선')?.expected).toEqual({
      kind: 'keywords',
      values: ['none'],
    });
    expect(checkOf([root], '', '효과(배경 흐림)')?.expected).toEqual({
      kind: 'keywords',
      values: ['none'],
    });
    expect(checkOf([root], '', '불투명도')?.expected).toEqual({ kind: 'number', value: 1 });
  });

  it('효과 스타일은 배경 흐림만 이름으로 보고 그림자는 판정하지 않는다', () => {
    const flyout = { ...root, effect: 'Surface/Flyout (Acrylic)' };
    const properties = variantChecks([flyout], [], tokens).checks.map((check) => check.property);
    expect(properties).not.toContain('box-shadow');
    expect(checkOf([flyout], '', '효과(배경 흐림)')).toMatchObject({
      property: 'backdrop-filter',
      variables: ['--backdrop-blur-surface-flyout-acrylic'],
    });
  });

  it('불투명도 변수는 0–100 값을 ÷100으로 바꾼다', () => {
    expect(checkOf([{ ...root, opacity: 'opacity/cut' }], '', '불투명도')).toMatchObject({
      variables: ['--opacity-cut'],
      expected: { kind: 'number', value: 0.5 },
    });
  });

  it('절대 위치(위치 방식, 붙는 변, 거리)는 판정하지 않는다', () => {
    const border = {
      path: 'bottom border',
      type: 'FRAME',
      self: {
        absolute: { horizontal: { constraint: 'STRETCH' }, vertical: { constraint: 'MAX' } },
      },
    };
    const checks = variantChecks([root, border], [], tokens);
    expect(checks.unsupported).toEqual([]);
    const properties = checks.checks
      .filter((check) => check.layer === 'bottom border')
      .map((check) => check.property);
    for (const property of ['position', 'left', 'right', 'top', 'bottom']) {
      expect(properties).not.toContain(property);
    }
  });

  it('자산은 파일과 글자 색(이름 + 값)을 본다', () => {
    const checks = variantChecks([root, icon], [], tokens);
    expect(checks.assets).toEqual([
      {
        layer: 'icon',
        file: 'icons/add.svg',
        color: {
          role: '자산 색',
          figma: 'text-fill/primary',
          property: 'color',
          variables: ['--color-text-fill-primary'],
          expected: { kind: 'color', rgba: [26, 26, 26, 255] },
          inherited: true,
        },
      },
    ]);
    expect(checkOf([root, icon], 'icon', '너비')).toMatchObject({
      property: 'width',
      variables: ['--spacing-icon-16'],
    });
  });

  it('글자 구간은 서체와 크기·굵기·줄 높이 변수, % 자간을 px로 바꾼 값을 본다(D2)', () => {
    const [text] = variantChecks([root, label], [], tokens).texts;
    expect(text?.characters).toBe('버튼');
    const [segment] = text?.segments ?? [];
    expect(segment?.fontFamily).toBe('Pretendard');
    expect(segment?.checks.map((check) => check.property)).toEqual([
      'color',
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'text-decoration-line',
    ]);
    expect(segment?.checks.find((check) => check.property === 'line-height')?.variables).toEqual([
      '--leading-body',
      '--text-body--line-height',
    ]);
    expect(segment?.checks.find((check) => check.property === 'letter-spacing')?.expected).toEqual({
      kind: 'length',
      px: 0.28,
    });
  });

  it('숨긴 레이어는 그대로 넘긴다(D4)', () => {
    expect(variantChecks([root], ['icon'], tokens).hidden).toEqual(['icon']);
  });

  it('변수에 연결되지 않은 값은 비교할 수 없음으로 남긴다', () => {
    const unbound = {
      ...icon,
      sizing: { horizontal: 'FIXED', vertical: 'HUG', width: { value: 16 } },
    };
    const checks = variantChecks([root, unbound], [], tokens);
    expect(checks.unsupported.map((item) => item.layer)).toEqual(['icon']);
  });
});
