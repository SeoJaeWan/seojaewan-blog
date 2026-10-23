import { describe, expect, it } from 'vitest';

import {
  captureMargin,
  captureRegion,
  outlineExtents,
  parseBoxShadow,
  pngSize,
  shadowExtents,
} from './capture.ts';

// @codocs [[피그마 연동:캡처 표]]
describe('캡처 영역', () => {
  it('캡처 대상의 테두리 상자에 같은 여백을 두고 정수 픽셀로 넓힌다', () => {
    expect(
      captureRegion({ x: 100.4, y: 50, width: 120.2, height: 32 }, 24, {
        width: 1280,
        height: 720,
      }),
    ).toEqual({
      canvas: { width: 169, height: 80 },
      clip: { x: 76, y: 26, width: 169, height: 80 },
      offset: { x: 0, y: 0 },
    });
  });

  it('화면 밖으로 나가는 부분은 찍지 않고 전체 영역 안의 자리를 알려 준다', () => {
    expect(
      captureRegion({ x: 10, y: 700, width: 100, height: 40 }, 24, { width: 1280, height: 720 }),
    ).toEqual({
      canvas: { width: 148, height: 88 },
      clip: { x: 0, y: 676, width: 134, height: 44 },
      offset: { x: 14, y: 0 },
    });
  });

  it('PNG 머리에서 픽셀 크기를 읽는다', () => {
    const header = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
    header.writeUInt32BE(120, 16);
    header.writeUInt32BE(32, 20);
    expect(pngSize(header)).toEqual({ width: 120, height: 32 });
    expect(() => pngSize(Buffer.from('not a png'))).toThrow();
  });

  it('계산된 box-shadow를 색 안의 쉼표에 상관없이 층으로 나눈다', () => {
    expect(
      parseBoxShadow('rgba(0, 0, 0, 0.14) 0px 8px 16px 0px, rgb(0, 0, 0) 0px 0px 2px 0px inset'),
    ).toEqual([
      { x: 0, y: 8, blur: 16, spread: 0, inset: false },
      { x: 0, y: 0, blur: 2, spread: 0, inset: true },
    ]);
    expect(parseBoxShadow('none')).toEqual([]);
  });

  it('바깥 그림자가 나가는 폭을 방향마다 구하고, 여백은 24px 이상이며 그림자보다 좁지 않게 한다', () => {
    const extents = shadowExtents([
      { x: 0, y: 8, blur: 16, spread: 0, inset: false },
      { x: 0, y: 0, blur: 40, spread: 0, inset: true },
    ]);
    expect(extents).toEqual({ left: 16, right: 16, top: 8, bottom: 24 });
    expect(captureMargin(extents)).toBe(24);
    expect(captureMargin({ ...extents, bottom: 64.5 })).toBe(65);
  });

  it('바깥 윤곽선(포커스 고리)은 두께와 간격만큼 사방으로 나간다', () => {
    expect(outlineExtents({ style: 'solid', width: '2px', offset: '0px' })).toEqual({
      left: 2,
      right: 2,
      top: 2,
      bottom: 2,
    });
    expect(outlineExtents({ style: 'none', width: '3px', offset: '0px' })).toEqual({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  });
});
