// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { sourceDir } from '../package-paths.ts';

/** Open Sans 원래 값(unitsPerEm 2048): ascent 2189, descent 600 */
const figmaAscent = 2189 / 2048;
const figmaDescent = 600 / 2048;

const tokensCss = readFileSync(path.join(sourceDir, 'tokens.css'), 'utf8');
const openSansCss = readFileSync(path.join(sourceDir, 'open-sans.css'), 'utf8');

// @codocs [[디자인 기반:서체]]
describe('글자 기준선', () => {
  const ascent = overridePercent('ascent-override') / 100;
  const descent = overridePercent('descent-override') / 100;
  const styles = typeStyles();

  it('type-* 글자 스타일을 읽는다', () => {
    expect(styles.length).toBeGreaterThan(0);
  });

  it.each(styles)('$name: Chromium 기준선이 피그마 기준선과 같다', ({ size, lineHeight }) => {
    expect(chromiumBaseline(size, lineHeight, ascent, descent)).toBe(
      figmaBaseline(size, lineHeight),
    );
  });
});

/**
 * Chromium 방식 기준선: 서체 높이를 반올림하고 남는 줄 높이를 위아래로 나눈다.
 * @param size 글자 크기(px)
 * @param lineHeight 줄 높이(px)
 * @param a 덮어쓴 ascent 비율
 * @param d 덮어쓴 descent 비율
 * @returns 줄 위에서 기준선까지 거리(px)
 */
function chromiumBaseline(size: number, lineHeight: number, a: number, d: number): number {
  const up = Math.round(a * size);
  const down = Math.round(d * size);
  return up + Math.floor((lineHeight - up - down) / 2);
}

/**
 * 피그마 방식 기준선: 서체 원래 높이로 줄 안에 가운데 놓는다.
 * @param size 글자 크기(px)
 * @param lineHeight 줄 높이(px)
 * @returns 줄 위에서 기준선까지 거리(px)
 */
function figmaBaseline(size: number, lineHeight: number): number {
  return Math.round((lineHeight - (figmaAscent + figmaDescent) * size) / 2 + figmaAscent * size);
}

/**
 * open-sans.css의 모든 @font-face에서 덮어쓰기 값을 읽는다. 값이 모두 같아야 한다.
 * @param name 속성 이름
 * @returns 퍼센트 값
 */
function overridePercent(name: string): number {
  const pattern = new RegExp(`${name}: ([0-9.]+)%;`, 'gu');
  const values = [...openSansCss.matchAll(pattern)].map((match) => Number(match[1]));
  expect(values.length).toBe((openSansCss.match(/@font-face/gu) ?? []).length);
  expect(new Set(values).size).toBe(1);
  return values[0] ?? Number.NaN;
}

/**
 * tokens.css의 Open Sans 기반 `type-*` 글자 스타일에서 크기와 줄 높이를 읽는다(코드 스타일은 Cascadia Mono라 뺀다).
 * @returns 스타일 이름과 px 값
 */
function typeStyles(): { name: string; size: number; lineHeight: number }[] {
  const variables = new Map(
    [...tokensCss.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gmu)].map((m) => [m[1], m[2]?.trim()]),
  );
  function px(ref: string | undefined): number {
    const name = /var\((--[\w-]+)\)/u.exec(ref ?? '')?.[1] ?? '';
    return Number.parseFloat(variables.get(name) ?? '');
  }
  return [...tokensCss.matchAll(/@utility (type-[\w-]+) \{([^}]*)\}/gu)]
    .filter((m) => !(m[2] ?? '').includes('--font-family-code'))
    .map((m) => ({
      name: m[1] ?? '',
      size: px(/font-size:\s*([^;]+);/u.exec(m[2] ?? '')?.[1]),
      lineHeight: px(/line-height:\s*([^;]+);/u.exec(m[2] ?? '')?.[1]),
    }));
}
