// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { readFigmaTokens } from './figma-tokens.ts';
import { compareTokenValues, readTokensCss } from './token-values.ts';

const json = {
  color: {
    blue: { 'dark-1': { $type: 'color', $value: '#005fb8' } },
  },
  'accent-fill': { default: { $type: 'color', $value: '{color.blue.dark-1}' } },
  radius: { control: { $type: 'dimension', $value: { unit: 'px', value: 4 } } },
  opacity: { cut: { $type: 'number', $value: 50 } },
  motion: { duration: { fast: { $type: 'duration', $value: { unit: 'ms', value: 167 } } } },
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
        },
      },
    },
    paint: {},
    text: {},
  },
};

const GOOD_CSS = `@theme static {
  --color-blue-dark-1: #005fb8;
  --color-accent-fill-default: var(--color-blue-dark-1);
  --radius-control: 4px;
  --opacity-cut: 50%;
  --motion-duration-fast: 167ms;
  --transition-duration-fast: var(--motion-duration-fast);
  --shadow-surface-flyout-acrylic: 0px 8px 16px 0px #00000024;
}`;

/**
 * 맞는 tokens.css의 한 줄을 바꿔 비교한다.
 * @param from 바꿀 글자
 * @param to 새 글자
 * @returns 실패 메시지
 */
function compareWith(from: string, to: string): string[] {
  return compareTokenValues(readFigmaTokens(json), readTokensCss(GOOD_CSS.replace(from, to)));
}

// @codocs [[피그마 일치 검사:판정 항목]]
describe('피그마 일치 검사:판정 항목 토큰 값 비교', () => {
  it('tokens.json과 맞는 tokens.css는 통과한다', () => {
    expect(compareWith('', '')).toEqual([]);
  });

  it('값이 다르면 실패한다', () => {
    expect(compareWith('--radius-control: 4px', '--radius-control: 3px')).toEqual([
      expect.stringContaining('radius/control: 값이 다르다'),
    ]);
  });

  it('색 값이 한 단계라도 다르면 실패한다', () => {
    expect(compareWith('#005fb8;', '#005fb9;')).toEqual([
      expect.stringContaining('color/blue/dark-1: 값이 다르다'),
    ]);
  });

  it('별칭을 값으로 풀어 쓰면 실패한다', () => {
    expect(compareWith('var(--color-blue-dark-1);', '#005fb8;')).toEqual([
      expect.stringContaining('accent-fill/default: 별칭'),
    ]);
  });

  it('불투명도는 백분율로 쓴 값을 0–1로 비교한다', () => {
    expect(compareWith('--opacity-cut: 50%', '--opacity-cut: 0.5')).toEqual([]);
    expect(compareWith('--opacity-cut: 50%', '--opacity-cut: 40%')).toEqual([
      expect.stringContaining('opacity/cut: 값이 다르다'),
    ]);
  });

  it('Tailwind용 이름은 변수 자신을 가리켜야 한다', () => {
    expect(compareWith('var(--motion-duration-fast);', '167ms;')).toEqual([
      expect.stringContaining('--transition-duration-fast는 var(--motion-duration-fast)'),
    ]);
  });

  it('tokens.json에 없는 토큰은 실패한다', () => {
    expect(
      compareWith('--radius-control: 4px;', '--radius-control: 4px;\n  --color-my-blue: #0000ff;'),
    ).toEqual(['--color-my-blue: tokens.json에 없는 토큰이다']);
  });

  it('효과 스타일은 이름이 있는지만 본다', () => {
    expect(compareWith('0px 8px 16px 0px #00000024', '0px 0px 0px 0px red')).toEqual([]);
    expect(compareWith('--shadow-surface-flyout-acrylic: 0px 8px 16px 0px #00000024;', '')).toEqual(
      ['효과 스타일 Surface/Flyout (Acrylic): tokens.css에 --shadow-surface-flyout-acrylic이 없다'],
    );
  });

  it('저장소의 tokens.css는 tokens.json과 맞는다', () => {
    if (!existsSync(tokensJsonPath)) {
      return;
    }
    const tokens = readFigmaTokens(JSON.parse(readFileSync(tokensJsonPath, 'utf8')));
    const css = readTokensCss(readFileSync(tokensCssPath, 'utf8'));
    expect(compareTokenValues(tokens, css)).toEqual([]);
  });
});
