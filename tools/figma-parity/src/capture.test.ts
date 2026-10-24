import { describe, expect, it } from 'vitest';

import {
  captureMargin,
  captureRegion,
  commonCanvas,
  figmaNodeLayout,
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

  it('여백은 코드 그림자, 코드의 노드 밖 자식, 피그마 PNG의 노드 밖 부분 가운데 가장 넓은 폭을 덮는다', () => {
    const shadow = { left: 8, right: 8, top: 4, bottom: 12 };
    const tail = { left: 0, right: 0, top: 8, bottom: 0 };
    expect(captureMargin(shadow, tail)).toBe(24);
    expect(captureMargin(shadow, tail, { left: 8, right: 8, top: 30.2, bottom: 12 })).toBe(31);
  });

  it('피그마 PNG 안 노드 위치가 있으면 그대로 써서, 위로 나온 꼬리가 있어도 노드끼리 맞춘다', () => {
    // Tooltip Type=Balloon: 노드 300×42, PNG 316×66(꼬리와 그림자 포함)
    expect(
      figmaNodeLayout(
        { width: 316, height: 66 },
        { x: 8, y: 12, width: 300, height: 42 },
        { left: 8, right: 8, top: 4, bottom: 12 },
      ),
    ).toEqual({
      extents: { left: 8, top: 12, right: 8, bottom: 12 },
      size: { width: 300, height: 42 },
    });
  });

  it('노드 위치가 없는 예전 내보내기는 코드 루트 그림자의 폭으로 짐작하고, 그 폭이 PNG보다 크면 PNG 전체를 노드로 본다', () => {
    const shadow = { left: 8, right: 8, top: 4, bottom: 12 };
    expect(figmaNodeLayout({ width: 66, height: 46 }, null, shadow)).toEqual({
      extents: shadow,
      size: { width: 50, height: 30 },
    });
    expect(figmaNodeLayout({ width: 10, height: 10 }, null, shadow)).toEqual({
      extents: { left: 0, right: 0, top: 0, bottom: 0 },
      size: { width: 10, height: 10 },
    });
  });

  it('두 그림은 같은 크기로 만들고, 크기가 다르면 큰 쪽에 맞춘다', () => {
    expect(commonCanvas({ width: 96, height: 78 }, { width: 98, height: 77.5 })).toEqual({
      width: 98,
      height: 78,
    });
  });
});
