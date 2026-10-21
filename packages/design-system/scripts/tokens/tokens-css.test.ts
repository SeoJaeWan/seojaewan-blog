// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { TOKENS_FIXTURE } from './tokens-css.fixture.ts';
import { TokenFormatError, tokensToCss, variableName } from './tokens-css.ts';

const css = tokensToCss(TOKENS_FIXTURE);

// @codocs [[피그마 일치 검사:토큰 생성]]
describe('토큰 생성', () => {
  it('WinUI 경로 이름을 Tailwind 이름공간 이름으로 바꾼다', () => {
    expect(variableName(['text-fill', 'primary'])).toBe('--color-text-fill-primary');
    expect(variableName(['color', 'gray', 'f9f9f9'])).toBe('--color-gray-f9f9f9');
    expect(variableName(['spacing', '12'])).toBe('--spacing-12');
    expect(variableName(['size', 'control', 'height'])).toBe('--spacing-control-height');
    expect(variableName(['radius', 'control'])).toBe('--radius-control');
    expect(variableName(['stroke-width', 'default'])).toBe('--border-width-default');
    expect(variableName(['font', 'size', 'body'])).toBe('--text-body');
    expect(variableName(['font', 'line-height', 'body'])).toBe('--leading-body');
    expect(variableName(['font', 'weight', 'semibold'])).toBe('--font-weight-semibold');
    expect(variableName(['font', 'family', 'code'])).toBe('--font-code');
  });

  it('별칭은 실제 값으로 풀지 않고 var() 참조로 남긴다', () => {
    expect(css).toContain('--color-text-fill-primary: var(--color-black-alpha-e4);');
    expect(css).toContain('--color-caption-button-close-fill-hover: var(--color-red-dark-1);');
  });

  it('리터럴 값을 CSS 값으로 바꾼다', () => {
    expect(css).toContain('--color-black-alpha-e4: #000000e4;');
    expect(css).toContain('--spacing-4: 4px;');
    expect(css).toContain('--radius-circular: 9999px;');
    expect(css).toContain('--opacity-cut: 50%;');
    expect(css).toContain('--font-weight-semibold: 600;');
  });

  it('글자 크기와 같은 이름의 줄 높이를 text 유틸리티에 함께 묶는다', () => {
    expect(css).toContain('--text-body: 14px;');
    expect(css).toContain('--text-body--line-height: var(--leading-body);');
  });

  it('효과 스타일을 그림자와 배경 블러로 바꾼다', () => {
    expect(css).toContain('--shadow-elevation-card: 0px 2px 4px 0px #0000000a;');
    expect(css).toContain(
      '--shadow-elevation-dialog: 0px 2px 21px 0px #00000026, 0px 32px 64px 0px #00000030;',
    );
    expect(css).toContain('--shadow-surface-flyout-acrylic: 0px 8px 16px 0px #00000024;');
    expect(css).toContain('--backdrop-blur-surface-flyout-acrylic: var(--blur-acrylic);');
    expect(css).toContain('--backdrop-blur-material-acrylic: 60px;');
    expect(css).not.toContain('--shadow-material-acrylic');
    expect(css).toContain('--text-shadow-desktop-label-shadow: 0px 1px 2px #00000099;');
  });

  it('층이 여럿인 재질 칠 스타일은 만들지 않고 단색 칠 스타일만 만든다', () => {
    expect(css).not.toContain('--color-material-acrylic-default');
    expect(css).toContain(
      '--color-material-fallback-acrylic-default: var(--color-acrylic-background-fill-default-fallback);',
    );
  });

  it('그라데이션 칠 스타일은 층을 옮긴 --gradient-* 배경 값이 된다', () => {
    expect(css).toContain(
      '--gradient-elevation-control-border: linear-gradient(to bottom, var(--color-control-stroke-default) 90.58%, var(--color-control-stroke-secondary) 100%);',
    );
    // layers가 없으면 $value의 정지점을 위에서 아래로 칠한다.
    expect(css).toContain(
      '--gradient-elevation-text-control-border-focused: linear-gradient(to bottom, var(--color-control-stroke-default) 96.88%, ',
    );
  });

  it('투명도와 RGB가 모두 다른 정지점 사이에는 피그마처럼 투명도를 곱하지 않고 섞은 중간 정지점을 넣는다', () => {
    // #0000000f(검정 6%) → #005fb8(강조색 100%): 중간 정지점은 RGB와 투명도를 각각 따로 섞은 값이다.
    expect(css).toContain(
      'var(--color-control-stroke-default) 96.88%, #0013253f 96.882%, #00264a6f 96.884%, #00396e9f 96.886%, #004c93cf 96.888%, var(--color-accent-fill-default) 96.89%',
    );
  });

  it('RGB가 같은 정지점 사이(투명도만 다름)는 CSS와 결과가 같으므로 중간 정지점을 넣지 않는다', () => {
    expect(css).toContain(
      'linear-gradient(to bottom, var(--color-control-stroke-default) 90.58%, var(--color-control-stroke-secondary) 100%)',
    );
  });

  it('그라데이션 방향은 gradientTransform에서 구한다', () => {
    /**
     * 그라데이션 층 하나뿐인 칠 스타일로 CSS를 만든다.
     * @param gradientTransform 피그마 변환 행렬
     * @param opacity 층 불투명도
     * @returns 만든 CSS
     */
    function gradientCss(gradientTransform: number[][], opacity = 1): string {
      const stops = [
        { color: '#000000', position: 0 },
        { color: '#ffffff', position: 1 },
      ];
      return tokensToCss({
        style: {
          paint: {
            G: {
              $type: 'gradient',
              $value: stops,
              $extensions: {
                'com.seojaewan': {
                  layers: [
                    { type: 'GRADIENT_LINEAR', gradientStops: stops, gradientTransform, opacity },
                  ],
                },
              },
            },
          },
        },
      });
    }
    expect(
      gradientCss([
        [1, 0, 0],
        [0, 1, 0],
      ]),
    ).toContain('--gradient-g: linear-gradient(to right, #000000 0%, #ffffff 100%);');
    expect(
      gradientCss([
        [0, -1, 1],
        [1, 0, 0],
      ]),
    ).toContain('--gradient-g: linear-gradient(to top, #000000 0%, #ffffff 100%);');
    expect(
      gradientCss(
        [
          [1, 0, 0],
          [0, 1, 0],
        ],
        0.5,
      ),
    ).toContain('color-mix(in srgb, #000000 50%, transparent) 0%');
  });

  it('모든 토큰을 @theme 블록 하나에 담는다', () => {
    expect(css.match(/@theme/gu)).toHaveLength(1);
  });

  it('없는 변수를 가리키는 별칭은 실패한다', () => {
    expect(() =>
      tokensToCss({ 'text-fill': { primary: { $type: 'color', $value: '{color.none}' } } }),
    ).toThrow(TokenFormatError);
  });

  it('이름 규칙이 없는 서체 변수는 실패한다', () => {
    expect(() =>
      tokensToCss({ font: { stretch: { body: { $type: 'number', $value: 1 } } } }),
    ).toThrow(TokenFormatError);
  });

  it('서로 다른 토큰이 같은 CSS 이름이 되면 실패한다', () => {
    expect(() =>
      tokensToCss({
        size: { '4': { $type: 'dimension', $value: { value: 4, unit: 'px' } } },
        spacing: { '4': { $type: 'dimension', $value: { value: 4, unit: 'px' } } },
      }),
    ).toThrow(TokenFormatError);
  });

  it('src/tokens.css가 figma/tokens.json과 맞다', () => {
    if (!existsSync(tokensJsonPath)) {
      // 플러그인이 아직 토큰을 내보내지 않았다. 커밋된 tokens.css를 그대로 쓴다.
      return;
    }
    const tokens: unknown = JSON.parse(readFileSync(tokensJsonPath, 'utf8'));
    expect(readFileSync(tokensCssPath, 'utf8'), path.basename(tokensCssPath)).toBe(
      tokensToCss(tokens),
    );
  });
});

// @codocs [[디자인 기반:모션]]
describe('모션 토큰', () => {
  it('Motion 변수는 --motion-* 이름으로 만든다', () => {
    expect(css).toContain('--motion-duration-fast: 167ms;');
    expect(css).toContain('--motion-easing-direct-entrance: cubic-bezier(0, 0, 0, 1);');
    expect(css).toContain('--motion-scale-window-enter: 0.96;');
  });

  it('지속 시간과 이징은 Tailwind 유틸리티 이름으로도 참조한다', () => {
    expect(css).toContain('--transition-duration-fast: var(--motion-duration-fast);');
    expect(css).toContain('--ease-direct-entrance: var(--motion-easing-direct-entrance);');
    expect(css).toContain('--ease-fade: var(--motion-easing-fade);');
  });
});

// @codocs [[디자인 기반:서체]]
describe('서체', () => {
  it('라틴 서체 변수에는 한글 서체를 이어 붙인다', () => {
    expect(css).toContain("--font-base: 'Open Sans', var(--font-korean);");
    expect(css).toContain("--font-code: 'Cascadia Mono', var(--font-korean);");
    expect(css).toContain("--font-korean: 'Pretendard';");
  });

  it('글자 스타일마다 type-* 유틸리티를 만든다', () => {
    expect(css).toContain(`@utility type-body-strong {
  font-family: var(--font-base);
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-body);
  letter-spacing: 0em;
}`);
    expect(css).toContain('@utility type-code {\n  font-family: var(--font-code);');
  });

  it('Hangul 글자 스타일은 따로 만들지 않는다', () => {
    expect(css).not.toContain('type-hangul');
  });

  it('Hangul 글자 스타일이 짝인 라틴 스타일과 크기가 다르면 실패한다', () => {
    const fields = {
      fontFamily: '{font.family.korean}',
      fontWeight: 400,
      fontSize: { value: 14, unit: 'px' },
      lineHeight: { value: 20, unit: 'px' },
      letterSpacing: { value: 0, unit: '%' },
    };
    const tokens = {
      font: { family: { korean: { $type: 'fontFamily', $value: 'Pretendard' } } },
      style: {
        text: {
          Body: { $type: 'typography', $value: fields },
          Hangul: { Body: { $type: 'typography', $value: fields } },
        },
      },
    };
    expect(() => tokensToCss(tokens)).not.toThrow();
    tokens.style.text.Hangul.Body.$value = { ...fields, fontSize: { value: 15, unit: 'px' } };
    expect(() => tokensToCss(tokens)).toThrow(TokenFormatError);
  });
});
