// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { TOKENS_FIXTURE } from './tokens-css.fixture.ts';
import { naturalCompare, TokenFormatError, tokensJsonToCss } from './tokens-css.ts';

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
    expect(css).toContain('  --text-fill-primary: var(--color-black-alpha-66);');
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
    expect(css).toContain('  --control-stroke-default: var(--color-black-alpha-0f);');
  });

  it('값은 CSS 형식이다(색 소문자, px, ms, 백분율 불투명도, cubic-bezier, 서체 따옴표)', () => {
    expect(css).toContain('  --color-black-alpha-0f: #0000000f;');
    expect(css).toContain('  --motion-duration-fast: 167ms;');
    expect(css).toContain('  --opacity-cut: 50%;');
    expect(css).toContain('  --motion-easing-fade: cubic-bezier(0, 0, 1, 1);');
    expect(css).toContain('  --motion-scale-enter: 0.96;');
    expect(css).toContain("  --font-family-base: 'Open Sans';");
  });

  it('Tailwind 기본값 지우기가 토큰 정의보다 앞에 있다', () => {
    const clearing = css.indexOf('--color-*: initial;');
    expect(clearing).toBeGreaterThan(-1);
    expect(clearing).toBeLessThan(css.indexOf(':root {'));
    expect(clearing).toBeLessThan(css.indexOf('@theme static {'));
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
    expect(root).toContain('--color-black-alpha-0f:');
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

  it('클래스는 이름공간마다 --value()로 토큰을 읽는 @utility다', () => {
    expect(utilityBlock('border-*')).toContain('border-width: --value(--stroke-width-*);');
    expect(utilityBlock('duration-*')).toContain(
      'transition-duration: --value(--motion-duration-*);',
    );
    expect(utilityBlock('ease-*')).toContain(
      'transition-timing-function: --value(--motion-easing-*);',
    );
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

// @codocs [[피그마 연동:토큰 검사]]
describe('토큰 검사', () => {
  it('커밋된 src/tokens.css가 figma/tokens.json에서 만든 결과와 같다', () => {
    const json: unknown = JSON.parse(readFileSync(tokensJsonPath, 'utf8'));
    expect(readFileSync(tokensCssPath, 'utf8')).toBe(tokensJsonToCss(json));
  });
});
