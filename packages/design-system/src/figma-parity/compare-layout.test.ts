import { describe, expect, it } from 'vitest';

import type { LayerMeasure } from '../figma-export/component-layout';
import {
  compareLayer,
  type CompareOptions,
  type ObservedLayer,
  parseGradientStops,
  parseShadows,
} from './compare-layout';

const defaultOptions: CompareOptions = { ignored: new Set(), assetOf: () => undefined };

function expected(overrides: Partial<LayerMeasure> = {}): LayerMeasure {
  return {
    x: 12,
    y: 6,
    width: 96,
    height: 20,
    opacity: 1,
    fills: [{ type: 'SOLID', color: { r: 255, g: 255, b: 255, a: 255 }, opacity: 0.7 }],
    stroke: null,
    cornerRadius: { topLeft: 4, topRight: 4, bottomRight: 4, bottomLeft: 4 },
    shadows: [],
    text: null,
    asset: null,
    ...overrides,
  };
}

function observed(overrides: Partial<ObservedLayer> = {}): ObservedLayer {
  const side = { width: 0, color: 'rgb(0, 0, 0)' };
  return {
    rect: { x: 12, y: 6, width: 96, height: 20 },
    opacity: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.698)',
    backgroundImage: 'none',
    color: 'rgb(0, 0, 0)',
    border: { top: side, right: side, bottom: side, left: side },
    outline: { style: 'none', width: 0, color: 'rgb(0, 0, 0)', offset: 0 },
    ring: {
      content: 'none',
      width: 0,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      backgroundImage: 'none',
    },
    radius: { topLeft: 4, topRight: 4, bottomRight: 4, bottomLeft: 4 },
    boxShadow: 'none',
    textShadow: 'none',
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 400,
    objectFit: 'fill',
    asset: null,
    ...overrides,
  };
}

// @codocs [[디자인 시스템:생성 결과 검증]]
describe('생성 결과 검증', () => {
  it('피그마 값과 브라우저 값이 같으면 다른 값이 없다', () => {
    expect(compareLayer('', expected(), observed(), defaultOptions)).toEqual([]);
  });

  it('자리와 크기는 반올림 차이(0.02px)만 받고, 다르면 어느 레이어의 어느 값인지 낸다', () => {
    expect(
      compareLayer(
        'label',
        expected(),
        observed({ rect: { x: 12.01, y: 6, width: 96, height: 20 } }),
        defaultOptions,
      ),
    ).toEqual([]);
    expect(
      compareLayer(
        'label',
        expected(),
        observed({ rect: { x: 13, y: 6, width: 96, height: 20 } }),
        defaultOptions,
      ),
    ).toEqual([{ layer: 'label', field: 'x', expected: '12px', actual: '13px' }]);
  });

  it('색은 칠 불투명도를 곱해 0~255로 견주고 토큰 색의 반올림(1)만 받는다', () => {
    const mismatches = compareLayer(
      '',
      expected(),
      observed({ backgroundColor: 'rgba(0, 0, 0, 0.06)' }),
      defaultOptions,
    );
    expect(mismatches.map((mismatch) => mismatch.field)).toEqual(['fills[SOLID]']);
  });

  it('안쪽 선은 ::before 고리, 바깥 선은 outline과 견준다', () => {
    const inside = expected({
      stroke: {
        paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 255 }, opacity: 0.06 }],
        weight: { top: 1, right: 1, bottom: 1, left: 1 },
        align: 'INSIDE',
      },
    });
    const ring = {
      content: '""',
      width: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
      backgroundImage: 'none',
    };
    expect(compareLayer('', inside, observed({ ring }), defaultOptions)).toEqual([]);
    const outside = expected({
      stroke: {
        paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 255 }, opacity: 0.89 }],
        weight: { top: 2, right: 2, bottom: 2, left: 2 },
        align: 'OUTSIDE',
      },
    });
    expect(
      compareLayer(
        '',
        outside,
        observed({
          outline: { style: 'solid', width: 1, color: 'rgba(0, 0, 0, 0.89)', offset: 0 },
        }),
        defaultOptions,
      ).map((mismatch) => mismatch.field),
    ).toEqual([
      'stroke.weight.top',
      'stroke.weight.right',
      'stroke.weight.bottom',
      'stroke.weight.left',
    ]);
  });

  it('그라데이션은 피그마 정지점이 모두 있으면 tokens.css가 넣은 중간 정지점을 받는다', () => {
    const gradient = expected({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          stops: [
            { position: 0.9067, color: { r: 255, g: 255, b: 255, a: 20 } },
            { position: 1, color: { r: 0, g: 0, b: 0, a: 102 } },
          ],
          opacity: 1,
        },
      ],
    });
    const css =
      'linear-gradient(rgba(255, 255, 255, 0.08) 90.67%, rgba(204, 204, 204, 0.14) 92.536%, rgba(0, 0, 0, 0.4) 100%)';
    expect(
      compareLayer(
        '',
        gradient,
        observed({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: css }),
        defaultOptions,
      ),
    ).toEqual([]);
    expect(parseGradientStops(css)).toHaveLength(3);
  });

  it('그림자는 쌓는 순서와 상관없이 견준다', () => {
    const shadows = expected({
      shadows: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 48 },
          offsetX: 0,
          offsetY: 32,
          radius: 64,
          spread: 0,
        },
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 38 },
          offsetX: 0,
          offsetY: 2,
          radius: 21,
          spread: 0,
        },
      ],
    });
    const css = 'rgba(0, 0, 0, 0.15) 0px 2px 21px 0px, rgba(0, 0, 0, 0.19) 0px 32px 64px 0px';
    expect(parseShadows(css)).toHaveLength(2);
    expect(compareLayer('', shadows, observed({ boxShadow: css }), defaultOptions)).toEqual([]);
  });

  it('실행 중에 동작이 덮는 값과 합친 레이어의 모습은 견주지 않는다', () => {
    const ignoring = { ...defaultOptions, ignored: new Set(['width', 'look']) };
    const mismatches = compareLayer(
      '',
      expected(),
      observed({ rect: { x: 12, y: 6, width: 50, height: 20 }, backgroundColor: 'rgb(0, 0, 0)' }),
      ignoring,
    );
    expect(mismatches).toEqual([]);
  });
});
