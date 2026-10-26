// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { TOKENS_FIXTURE } from './tokens-css.fixture.ts';
import { naturalCompare, roundAngle, TokenFormatError, tokensJsonToCss } from './tokens-css.ts';

const css = tokensJsonToCss(TOKENS_FIXTURE);

/**
 * 생성 결과에서 `@utility` 블록 하나를 꺼낸다.
 * @param name 유틸리티 이름
 * @returns 블록 글자
 */
function utilityBlock(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  return start === -1 ? '' : css.slice(start, css.indexOf('\n}', start) + 2);
}

// @codocs [[피그마 연동:토큰 생성]]
describe('토큰 생성', () => {
  it('변수 이름은 -- 뒤에 피그마 경로를 -로 이은 것이다', () => {
    expect(css).toContain('  --text-fill-primary: var(--color-black-40);');
    expect(css).toContain('  --size-control-height: 32px;');
    expect(css).toContain('  --font-line-height-body: 20px;');
  });

  it('스타일 이름도 스타일 경로를 같은 방식으로 잇고 공백은 -, 괄호는 뺀다', () => {
    expect(css).toContain('  --elevation-flyout: 0px 8px 16px 0px #00000024;');
  });

  it('배경 흐림이 있는 효과 스타일은 -shadow와 -backdrop-blur 변수로 나눈다', () => {
    expect(css).toContain('  --surface-flyout-acrylic-shadow: 0px 8px 16px 0px #00000024;');
    expect(css).toContain('  --surface-flyout-acrylic-backdrop-blur: var(--blur-acrylic);');
    expect(css).toContain('  --material-acrylic-backdrop-blur: var(--blur-acrylic);');
  });

  it('별칭은 풀지 않고 var() 참조로 남긴다', () => {
    expect(css).toContain('  --control-stroke-default: var(--color-black-6);');
  });

  it('값은 CSS 형식이다(색 소문자, px, ms, 백분율 불투명도, cubic-bezier, 서체 따옴표)', () => {
    expect(css).toContain('  --color-black-6: #0000000f;');
    expect(css).toContain('  --motion-duration-fast: 167ms;');
    expect(css).toContain('  --opacity-cut: 50%;');
    expect(css).toContain('  --motion-easing-direct-entrance: cubic-bezier(0, 0, 0, 1);');
    expect(css).toContain('  --motion-scale-enter: 0.96;');
    expect(css).toContain("  --font-family-base: 'Open Sans';");
  });

  it('직선 이징([0, 0, 1, 1], 피그마 LINEAR)은 linear다', () => {
    expect(css).toContain('  --motion-easing-fade: linear;');
  });

  it('Tailwind 기본값 지우기가 토큰 정의보다 앞에 있다', () => {
    const clearing = css.indexOf('--color-*: initial;');
    expect(clearing).toBeGreaterThan(-1);
    expect(clearing).toBeLessThan(css.indexOf(':root {'));
    expect(clearing).toBeLessThan(css.indexOf('@theme static {'));
  });

  it('Tailwind 기본 이징과 애니메이션(animate-spin 등)도 지운다', () => {
    const clearing = css.slice(css.indexOf('@theme {'), css.indexOf(':root {'));
    expect(clearing).toContain('  --ease-*: initial;');
    expect(clearing).toContain('  --animate-*: initial;');
  });

  it('motion/* 변수는 유틸리티 없이 :root에 두고 motion.css가 var()로 쓴다', () => {
    const root = css.slice(css.indexOf(':root {'), css.indexOf('@theme static {'));
    expect(root).toContain('  --motion-duration-fast: 167ms;');
    expect(root).toContain('  --motion-easing-fade: linear;');
    expect(root).toContain('  --motion-scale-enter: 0.96;');
    expect(css).not.toMatch(/@utility (duration|ease|delay)-\*/u);
    expect(css).not.toContain('--value(--motion-');
  });

  it('기본 서체는 Body 글자 스타일의 서체에 한글 서체를 이어 붙인다', () => {
    expect(css).toContain(
      '  --default-font-family: var(--font-family-base), var(--font-family-korean);',
    );
  });

  it('그라데이션은 위에서 아래로 정지점 위치와 함께 쓰고, 투명도와 RGB가 모두 다른 정지점 사이에 중간 정지점을 넣는다', () => {
    expect(css).toContain(
      '  --elevation-accent-control-border: linear-gradient(to bottom, ' +
        'var(--control-stroke-on-accent-default) 90.67%, #cccccc24 92.536%, #99999935 94.402%, ' +
        '#66666645 96.268%, #33333356 98.134%, var(--control-stroke-on-accent-secondary) 100%);',
    );
  });

  it('안쪽 그림자는 값 앞에 inset을 붙인다', () => {
    expect(css).toContain('  --elevation-inset: inset 0px 2px 4px 0px #0000000f;');
    expect(css).not.toContain('--elevation-flyout: inset');
  });

  it('여러 층 그림자는 층을 쉼표로 잇고 피그마의 층 순서를 지킨다', () => {
    expect(css).toContain(
      '  --elevation-double: 0px 32px 64px 0px #00000038, 0px 2px 4px 0px #00000024;',
    );
  });

  it('% 자간은 글자 크기 기준 em으로, px 자간은 px 그대로 쓴다', () => {
    expect(utilityBlock('type-body-strong')).toContain('  letter-spacing: -0.015em;');
    expect(utilityBlock('type-caption')).toContain('  letter-spacing: 0.5px;');
  });

  it('숫자로 된 크기 이름도 --size-<숫자> 변수가 되고 w-* 클래스가 읽는다', () => {
    expect(css).toContain('  --size-240: 240px;');
    expect(utilityBlock('w-*')).toBe('@utility w-* {\n  width: --value(--size-*);\n}');
  });

  it('투명도가 같거나 RGB가 같은 정지점 사이에는 중간 정지점을 넣지 않는다', () => {
    expect(css).toContain(
      '  --border-same-alpha: linear-gradient(to bottom, var(--color-gray-200) 0%, var(--color-white) 100%);',
    );
    expect(css).toContain(
      '  --border-same-rgb: linear-gradient(to bottom, var(--color-black-6) 25%, var(--color-black-40) 75%);',
    );
  });

  it('색은 쓴 자릿수 그대로 소문자로 옮긴다(6자리는 불투명, 8자리는 투명도 포함)', () => {
    expect(css).toContain('  --color-white: #ffffff;');
    expect(css).toContain('  --color-blue-dark-2: #0f6cbd;');
    expect(css).toContain('  --color-blue-dark-1-90: #0f6cbde6;');
    expect(css).toContain('  --color-gray-500-76: #8a8a8ac2;');
    expect(css).toContain('  --accent-fill-default: var(--color-blue-dark-1-90);');
  });

  it('변수에 연결한 단색 칠 스타일은 칠 불투명도를 알파로 쓰고 이미지 층은 그리지 않는다', () => {
    expect(css).toContain(
      '  --material-acrylic-default: rgb(from var(--acrylic-background-fill-default) r g b / 0.85);',
    );
    expect(css).toContain(
      '  --material-fallback-acrylic-default: var(--acrylic-background-fill-default);',
    );
    expect(css).not.toContain('noise');
  });

  it('재질은 반투명 바탕색과 짝인 Material 효과 스타일의 배경 흐림을 함께 정한다', () => {
    expect(utilityBlock('material-acrylic-default')).toBe(
      [
        '@utility material-acrylic-default {',
        '  background-color: var(--material-acrylic-default);',
        '  -webkit-backdrop-filter: blur(var(--material-acrylic-backdrop-blur));',
        '  backdrop-filter: blur(var(--material-acrylic-backdrop-blur));',
        '}',
      ].join('\n'),
    );
    expect(utilityBlock('material-fallback-acrylic-default')).toBe('');
  });

  it('배경 흐림이 있는 효과 스타일은 그림자와 배경 흐림을 정하는 스타일 이름의 유틸리티가 된다', () => {
    expect(utilityBlock('surface-flyout-acrylic')).toBe(
      [
        '@utility surface-flyout-acrylic {',
        '  box-shadow: var(--surface-flyout-acrylic-shadow);',
        '  -webkit-backdrop-filter: blur(var(--surface-flyout-acrylic-backdrop-blur));',
        '  backdrop-filter: blur(var(--surface-flyout-acrylic-backdrop-blur));',
        '}',
      ].join('\n'),
    );
    expect(utilityBlock('elevation-flyout')).toBe('');
  });

  it('유틸리티가 읽는 변수만 @theme에 두고 나머지는 :root에 둔다', () => {
    const root = css.slice(css.indexOf(':root {'), css.indexOf('@theme static {'));
    const theme = css.slice(css.indexOf('@theme static {'));
    // Primitive 색은 클래스를 만들지 않는다
    expect(root).toContain('--color-black-6:');
    expect(css).not.toContain('@utility bg-color-*');
    // 글자 스타일만 쓰는 서체 값
    expect(root).toContain('--font-size-body:');
    expect(root).toContain('--surface-flyout-acrylic-backdrop-blur:');
    expect(theme).toContain('--text-fill-primary:');
    expect(theme).toContain('--spacing-2:');
    expect(theme).toContain('--font-weight-regular:');
  });

  it('글자 스타일은 변수로 서체·크기·굵기·줄 높이·자간을 정하는 type-* 유틸리티가 되고 Hangul 스타일은 서체 목록에 합친다', () => {
    expect(utilityBlock('type-body')).toBe(
      [
        '@utility type-body {',
        '  font-family: var(--font-family-base), var(--font-family-korean);',
        '  font-size: var(--font-size-body);',
        '  font-weight: var(--font-weight-regular);',
        '  line-height: var(--font-line-height-body);',
        '  letter-spacing: 0em;',
        '}',
      ].join('\n'),
    );
    expect(css).not.toContain('type-hangul');
  });

  it('스타일이 아닌 클래스는 이름공간을 빼고, 색은 토큰 이름 전체를 쓴다', () => {
    expect(utilityBlock('w-*')).toBe('@utility w-* {\n  width: --value(--size-*);\n}');
    expect(utilityBlock('bg-text-fill-*')).toBe(
      '@utility bg-text-fill-* {\n  background-color: --value(--text-fill-*);\n}',
    );
  });

  it('그림자만 있는 효과 스타일은 퍼짐 없는 text-shadow 변수와 text-shadow-* 클래스도 만든다', () => {
    expect(css).toContain('  --shadow-text-elevation-flyout: 0px 8px 16px #00000024;');
    expect(css).toContain(
      '  --shadow-text-elevation-double: 0px 32px 64px #00000038, 0px 2px 4px #00000024;',
    );
    expect(utilityBlock('text-shadow-elevation-*')).toBe(
      '@utility text-shadow-elevation-* {\n  text-shadow: --value(--shadow-text-elevation-*);\n}',
    );
    expect(css).toContain(
      ' * | `text-shadow-elevation-*` | text-shadow | `--shadow-text-elevation-*` |',
    );
  });

  it('퍼짐이 0이 아니거나 안쪽 그림자인 층이 있으면 text-shadow를 만들지 않는다', () => {
    expect(css).toContain('  --elevation-spread: ');
    expect(css).not.toContain('--shadow-text-elevation-spread');
    expect(css).toContain('  --elevation-inset: ');
    expect(css).not.toContain('--shadow-text-elevation-inset');
  });

  it('배경 흐림이 있는 효과 스타일은 text-shadow를 만들지 않는다', () => {
    expect(css).not.toContain('--shadow-text-surface');
    expect(css).not.toContain('--shadow-text-material');
    expect(utilityBlock('text-shadow-elevation-*')).not.toContain('surface');
  });

  it('클래스는 이름공간마다 --value()로 토큰을 읽는 @utility다', () => {
    expect(utilityBlock('border-*')).toContain('border-width: --value(--stroke-width-*);');
    expect(utilityBlock('shadow-elevation-*')).toContain('box-shadow: --value(--elevation-*);');
    expect(utilityBlock('border-gradient-elevation-*')).toContain(
      'background: --value(--elevation-*);',
    );
  });

  it('변수는 이름 순(숫자는 크기 순)이고 같은 입력이면 같은 결과다', () => {
    expect(css.indexOf('--spacing-2:')).toBeLessThan(css.indexOf('--spacing-10:'));
    expect(tokensJsonToCss(structuredClone(TOKENS_FIXTURE))).toBe(css);
    expect(['b-10', 'b-2', 'a'].sort(naturalCompare)).toEqual(['a', 'b-2', 'b-10']);
  });

  it('CSS 이름이 겹치면 실패한다', () => {
    const json = {
      a: { b: { $type: 'color', $value: '#000000' } },
      'a-b': { $type: 'color', $value: '#ffffff' },
    };
    expect(() => tokensJsonToCss(json)).toThrow(TokenFormatError);
  });

  it('변환 규칙이 없는 $type이나 없는 별칭은 실패한다', () => {
    expect(() => tokensJsonToCss({ a: { $type: 'strokeStyle', $value: 'solid' } })).toThrow(
      TokenFormatError,
    );
    expect(() => tokensJsonToCss({ a: { $type: 'color', $value: '{missing.token}' } })).toThrow(
      TokenFormatError,
    );
  });
});

// @codocs [[피그마 연동:토큰 생성]]
describe('그룹과 이름이 같은 변수', () => {
  const white = { $type: 'color', $value: '#ffffff' };
  const white70 = { $type: 'color', $value: '#ffffffb3' };
  const alias = { $type: 'color', $value: '{color.white.$root}' };

  it('$root 토큰의 CSS 이름은 그룹 경로이고 root 조각이 없다', () => {
    const output = tokensJsonToCss({ color: { white: { $root: white } } });
    expect(output).toContain('  --color-white: #ffffff;');
    expect(output).not.toContain('--color-white-root');
  });

  it('같은 그룹의 자식 토큰은 그룹 이름 뒤에 자기 이름을 잇는다', () => {
    const output = tokensJsonToCss({ color: { white: { $root: white, '70': white70 } } });
    expect(output).toContain('  --color-white: #ffffff;');
    expect(output).toContain('  --color-white-70: #ffffffb3;');
  });

  it('$root를 가리키는 별칭은 그룹 이름의 var()가 된다', () => {
    const output = tokensJsonToCss({
      color: { white: { $root: white, '70': white70 } },
      'text-fill': { primary: alias },
    });
    expect(output).toContain('  --text-fill-primary: var(--color-white);');
  });

  it('입력 순서가 달라도 결과가 같다', () => {
    const forward = tokensJsonToCss({
      color: { white: { $root: white, '70': white70 } },
      'text-fill': { primary: alias },
    });
    const backward = tokensJsonToCss({
      'text-fill': { primary: alias },
      color: { white: { '70': white70, $root: white } },
    });
    expect(backward).toBe(forward);
  });

  it('$root 없이 그룹 경로를 가리키는 별칭은 실패한다', () => {
    expect(() =>
      tokensJsonToCss({
        color: { white: { $root: white } },
        a: { b: { $type: 'color', $value: '{color.white}' } },
      }),
    ).toThrow(TokenFormatError);
  });

  it('$value와 자식 토큰이 함께 있는 객체는 실패한다', () => {
    expect(() => tokensJsonToCss({ color: { white: { ...white, '70': white70 } } })).toThrow(
      TokenFormatError,
    );
  });

  it('그룹 이름과 같은 CSS 이름이 둘이면 실패한다', () => {
    expect(() =>
      tokensJsonToCss({ color: { white: { $root: white } }, 'color-white': white70 }),
    ).toThrow(TokenFormatError);
  });
});

const blackToWhite = [
  { color: '#000000', position: 0 },
  { color: '#ffffff', position: 1 },
];

/**
 * 그라데이션 칠 스타일 하나로 tokens.css를 만들어 그 변수 값을 꺼낸다.
 * @param layer 칠 층(`type`, `gradientTransform`). undefined면 층 정보가 없는 옛 형식이다.
 * @param stops 정지점
 * @returns `--g` 변수 값
 */
function gradientValue(
  layer: Record<string, unknown> | undefined,
  stops: readonly { color: string; position: number }[] = blackToWhite,
): string {
  const extensions =
    layer === undefined
      ? {}
      : { $extensions: { 'com.seojaewan': { layers: [{ gradientStops: stops, ...layer }] } } };
  const output = tokensJsonToCss({
    style: { paint: { G: { $type: 'gradient', $value: stops, ...extensions } } },
  });
  const line = output.split('\n').find((text) => text.startsWith('  --g: '));
  return line?.slice('  --g: '.length, -1) ?? '';
}

/**
 * 선형 그라데이션 칠 층을 만든다.
 * @param gradientTransform 피그마 gradientTransform
 * @returns 칠 층
 */
function linear(gradientTransform: number[][]): Record<string, unknown> {
  return { type: 'GRADIENT_LINEAR', gradientTransform };
}

// @codocs [[피그마 연동:토큰 생성]]
describe('그라데이션 방향', () => {
  it('위→아래(피그마 기본 변환)는 기존 출력과 같게 to bottom이다', () => {
    expect(
      gradientValue(
        linear([
          [0, 1, 0],
          [-1, 0, 1],
        ]),
      ),
    ).toBe('linear-gradient(to bottom, #000000 0%, #ffffff 100%)');
  });

  it('층 정보나 변환이 없는 옛 tokens.json은 위→아래로 읽는다', () => {
    expect(gradientValue(undefined)).toBe('linear-gradient(to bottom, #000000 0%, #ffffff 100%)');
    expect(gradientValue({ type: 'GRADIENT_LINEAR' })).toBe(
      'linear-gradient(to bottom, #000000 0%, #ffffff 100%)',
    );
  });

  it('왼→오는 90deg, 아래→위는 0deg다', () => {
    expect(
      gradientValue(
        linear([
          [1, 0, 0],
          [0, 1, 0],
        ]),
      ),
    ).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
    expect(
      gradientValue(
        linear([
          [0, -1, 1],
          [1, 0, 0],
        ]),
      ),
    ).toBe('linear-gradient(0deg, #000000 0%, #ffffff 100%)');
  });

  it('왼아래→오른위 대각선은 45deg, 왼위→오른아래 대각선은 135deg이고 정지점은 모서리를 지난다', () => {
    expect(
      gradientValue(
        linear([
          [0.5, -0.5, 0.5],
          [0.5, 0.5, -0.5],
        ]),
      ),
    ).toBe('linear-gradient(45deg, #000000 0%, #ffffff 100%)');
    expect(
      gradientValue(
        linear([
          [0.5, 0.5, 0],
          [-0.5, 0.5, 0.5],
        ]),
      ),
    ).toBe('linear-gradient(135deg, #000000 0%, #ffffff 100%)');
  });

  it('60°는 CSS 그라데이션 선 길이(|sin| + |cos|)에 맞춰 정지점 위치를 옮긴다', () => {
    // 가운데를 지나고 길이 1인 60° 핸들(4자리 반올림 값, 실제 59.9993°). CSS 위치는 (t - 0.5) / (sin60 + cos60) + 0.5에 가깝다.
    const stops = [
      { color: '#000000', position: 0 },
      { color: '#000000', position: 0.2 },
      { color: '#ffffff', position: 0.4 },
      { color: '#ffffff', position: 1 },
    ];
    expect(
      gradientValue(
        linear([
          [0.866, -0.5, 0.317],
          [0.5, 0.866, -0.183],
        ]),
        stops,
      ),
    ).toBe(
      'linear-gradient(60deg, #000000 13.3968%, #000000 28.0381%, #ffffff 42.6794%, #ffffff 86.6032%)',
    );
  });

  it('핸들이 상자 끝에 닿지 않으면 정지점 위치를 그만큼 옮긴다', () => {
    // 위에서 25% 지점부터 75% 지점까지의 위→아래 핸들: t = 2y - 0.5
    expect(
      gradientValue(
        linear([
          [0, 2, -0.5],
          [-2, 0, 1.5],
        ]),
      ),
    ).toBe('linear-gradient(to bottom, #000000 25%, #ffffff 75%)');
    // 가운데부터 오른쪽 끝까지의 왼→오 핸들: t = 2x - 1
    expect(
      gradientValue(
        linear([
          [2, 0, -1],
          [0, 2, -0.5],
        ]),
      ),
    ).toBe('linear-gradient(90deg, #000000 50%, #ffffff 100%)');
  });

  it('선형이 아닌 그라데이션이나 길이 0인 방향은 실패한다', () => {
    expect(() => gradientValue({ type: 'GRADIENT_RADIAL', gradientTransform: [] })).toThrow(
      TokenFormatError,
    );
    expect(() =>
      gradientValue(
        linear([
          [0, 0, 0.5],
          [0, 0, 0.5],
        ]),
      ),
    ).toThrow(TokenFormatError);
    expect(() => gradientValue(linear([[0, 1, 0]]))).toThrow(TokenFormatError);
  });
});

describe('그라데이션 각도 반올림', () => {
  it('소수 첫째 자리로 반올림한다', () => {
    expect(roundAngle(123.456)).toBe(123.5);
    expect(roundAngle(45.06)).toBe(45.1);
  });

  it('0·90·180·270°와 0.05°보다 덜 차이 나면 정수가 된다', () => {
    expect(roundAngle(59.9971)).toBe(60);
    expect(roundAngle(89.97)).toBe(90);
    expect(roundAngle(180.04)).toBe(180);
    expect(roundAngle(270.049)).toBe(270);
  });

  it('0 이상 360 미만으로 맞춘다', () => {
    expect(roundAngle(-90)).toBe(270);
    expect(roundAngle(359.97)).toBe(0);
    expect(roundAngle(-0.01)).toBe(0);
    expect(Object.is(roundAngle(-0.01), -0)).toBe(false);
  });
});

// @codocs [[피그마 연동:토큰 검사]]
describe('토큰 검사', () => {
  it('커밋된 src/tokens.css가 figma/tokens.json에서 만든 결과와 같다', () => {
    const json: unknown = JSON.parse(readFileSync(tokensJsonPath, 'utf8'));
    expect(readFileSync(tokensCssPath, 'utf8')).toBe(tokensJsonToCss(json));
  });
});
