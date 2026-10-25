import { afterEach, describe, expect, it } from 'vitest';

import { parseCssTime, readCssTimeVariable } from './motion-time';

afterEach(() => {
  document.documentElement.style.removeProperty('--motion-delay-boot-screen');
});

describe('parseCssTime', () => {
  it('ms와 s 값을 밀리초로 바꾼다', () => {
    expect(parseCssTime('2500ms')).toBe(2500);
    expect(parseCssTime(' 0.25s ')).toBe(250);
    expect(parseCssTime('2S')).toBe(2000);
    expect(parseCssTime('.5s')).toBe(500);
  });

  it('빈 값, 단위 없는 값, 음수는 0이다', () => {
    expect(parseCssTime('')).toBe(0);
    expect(parseCssTime('2500')).toBe(0);
    expect(parseCssTime('var(--x)')).toBe(0);
    expect(parseCssTime('-100ms')).toBe(0);
  });
});

describe('readCssTimeVariable', () => {
  it('문서 루트의 시간 토큰을 밀리초로 읽는다', () => {
    document.documentElement.style.setProperty('--motion-delay-boot-screen', '2500ms');
    expect(readCssTimeVariable('--motion-delay-boot-screen')).toBe(2500);
  });

  it('토큰이 없으면(jsdom) 0이다', () => {
    expect(readCssTimeVariable('--motion-delay-boot-screen')).toBe(0);
  });
});
