import { describe, expect, it } from 'vitest';

import { parseScale, parseTranslate } from './layout-rect';

// @codocs [[항목 조작:순서 바꾸기 끌기]]
describe('항목 조작:순서 바꾸기 끌기 - 원래 자리 재기', () => {
  it('계산된 translate 값을 가로·세로 거리로 읽는다', () => {
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('12.5px')).toEqual({ x: 12.5, y: 0 });
    expect(parseTranslate('-4px 20px')).toEqual({ x: -4, y: 20 });
    expect(parseTranslate('3px 4px 0px')).toEqual({ x: 3, y: 4 });
  });

  it('계산된 scale 값을 가로·세로 배율로 읽는다', () => {
    expect(parseScale('none')).toEqual({ x: 1, y: 1 });
    expect(parseScale('')).toEqual({ x: 1, y: 1 });
    expect(parseScale('1.1')).toEqual({ x: 1.1, y: 1.1 });
    expect(parseScale('1.1 0.5')).toEqual({ x: 1.1, y: 0.5 });
  });
});
