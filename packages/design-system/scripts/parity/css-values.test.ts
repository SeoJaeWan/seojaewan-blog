// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  describeExpected,
  matchesExpected,
  parseColor,
  parseHex,
  parseShadow,
} from './css-values.ts';

// @codocs [[피그마 일치 검사:판정 항목]]
describe('값 변환', () => {
  it('피그마 색은 채널마다 0–255 정수, 투명도는 AA(없으면 FF)로 바꾼다', () => {
    expect(parseHex('#005fb8')).toEqual([0, 95, 184, 255]);
    expect(parseHex('#00000024')).toEqual([0, 0, 0, 36]);
    expect(parseHex('#fff')).toEqual([255, 255, 255, 255]);
  });

  it('계산값 색은 투명도 ×255를 반올림해 비교한다', () => {
    expect(parseColor('rgba(0, 95, 184, 0.898)')).toEqual([0, 95, 184, 229]);
    expect(parseColor('color(srgb 1 1 1 / 0.5)')).toEqual([255, 255, 255, 128]);
    expect(matchesExpected({ kind: 'color', rgba: [0, 95, 184, 255] }, 'rgb(0, 95, 184)')).toBe(
      true,
    );
    expect(matchesExpected({ kind: 'color', rgba: [0, 95, 184, 255] }, 'rgb(0, 95, 185)')).toBe(
      false,
    );
  });

  it('완전히 투명하면 채널을 보지 않는다', () => {
    expect(matchesExpected({ kind: 'color', rgba: [0, 0, 0, 0] }, 'rgba(255, 255, 255, 0)')).toBe(
      true,
    );
  });

  it('길이는 소수 셋째 자리까지 같아야 한다', () => {
    expect(matchesExpected({ kind: 'length', px: 0.28 }, '0.28px')).toBe(true);
    expect(matchesExpected({ kind: 'length', px: 12 }, '13px')).toBe(false);
    expect(matchesExpected({ kind: 'length', px: 0 }, '0')).toBe(true);
  });

  it('시간은 계산값(초) ×1000과 비교한다', () => {
    expect(matchesExpected({ kind: 'ms', value: 83 }, '0.083s')).toBe(true);
    expect(matchesExpected({ kind: 'ms', value: 83 }, '0.167s')).toBe(false);
  });

  it('이징은 cubic-bezier 네 값이나 같은 뜻의 CSS 이름과 비교한다', () => {
    expect(matchesExpected({ kind: 'bezier', points: [0, 0, 1, 1] }, 'linear')).toBe(true);
    expect(
      matchesExpected({ kind: 'bezier', points: [0, 0, 0, 1] }, 'cubic-bezier(0, 0, 0, 1)'),
    ).toBe(true);
    expect(matchesExpected({ kind: 'bezier', points: [0, 0, 0, 1] }, 'ease')).toBe(false);
  });

  it('회전은 rotate 속성과 transform 행렬을 함께 읽는다', () => {
    expect(matchesExpected({ kind: 'angle', deg: 90 }, '90deg|none')).toBe(true);
    expect(matchesExpected({ kind: 'angle', deg: 90 }, 'none|matrix(0, 1, -1, 0, 0, 0)')).toBe(
      true,
    );
    expect(matchesExpected({ kind: 'angle', deg: 90 }, 'none|none')).toBe(false);
  });

  it('그림자는 보이지 않는 Tailwind 층을 빼고 층마다 비교한다', () => {
    const value = 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.14) 0px 8px 16px 0px';
    expect(parseShadow(value)).toEqual([
      { rgba: [0, 0, 0, 36], x: 0, y: 8, blur: 16, spread: 0, inset: false },
    ]);
    const expected = {
      kind: 'shadow',
      layers: [{ rgba: [0, 0, 0, 36], x: 0, y: 8, blur: 16, spread: 0, inset: false }],
    } as const;
    expect(matchesExpected(expected, value)).toBe(true);
    expect(matchesExpected(expected, 'none')).toBe(false);
    expect(matchesExpected({ kind: 'shadow', layers: [] }, 'none')).toBe(true);
  });

  it('대응은 같은 뜻의 값 중 하나면 같다', () => {
    const expected = { kind: 'keywords', values: ['normal', 'flex-start', 'start'] } as const;
    expect(matchesExpected(expected, 'start')).toBe(true);
    expect(matchesExpected(expected, 'center')).toBe(false);
    expect(describeExpected(expected)).toBe('normal | flex-start | start');
  });
});
