import { describe, expect, it } from 'vitest';

import { colorToHex } from './color';

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('토큰 색은 소문자 16진수로 쓴다', () => {
  it('불투명 색은 #rrggbb다', () => {
    expect(colorToHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
    expect(colorToHex({ r: 0, g: 0.372549, b: 0.721569, a: 1 })).toBe('#005fb8');
  });

  it('알파가 1보다 작으면 #rrggbbaa다', () => {
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 0.14 })).toBe('#00000024');
    expect(colorToHex({ r: 1, g: 1, b: 1, a: 0 })).toBe('#ffffff00');
  });

  it('채널은 0–255로 반올림하고 범위를 넘으면 자른다', () => {
    expect(colorToHex({ r: 0.5, g: 0.501, b: 1.2 })).toBe('#8080ff');
    expect(colorToHex({ r: -0.1, g: 0, b: 0 })).toBe('#000000');
  });
});
