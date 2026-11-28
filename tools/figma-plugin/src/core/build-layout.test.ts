import { describe, expect, it } from 'vitest';

import { buildComponentLayout, timelineLayout } from './build-layout';
import type { NodeData } from './node-data';
import {
  buttonRoot,
  component,
  iconAsset,
  instance,
  node,
  solid,
  text,
  variant,
} from './node-data.fixture';

// @codocs [[디자인 시스템:생성 결과 검증]]
describe('검증 자료: 피그마가 돌려준 최종 값에서 단위만 바꾼다', () => {
  const layout = buildComponentLayout(component());
  const [first] = layout.variants;

  it('변형은 스키마와 같은 이름·순서이고 변형 루트의 크기를 적는다', () => {
    expect(layout.name).toBe('Button');
    expect(first).toMatchObject({ name: 'Variant=Standard', width: 120, height: 32 });
  });

  it('자리는 변형 왼쪽 위 기준이다', () => {
    expect(first?.layers['']).toMatchObject({ x: 0, y: 0, width: 120, height: 32 });
    expect(first?.layers.label).toMatchObject({ x: 47.5, y: 6, width: 25, height: 20 });
  });

  it('색은 네 채널을 0~255로 옮기고 칠 불투명도는 따로 둔다', () => {
    const tinted = buildComponentLayout(
      component({
        variants: [
          variant(
            'V',
            {},
            {
              ...buttonRoot(),
              fills: [{ ...solid('Blue/60', 0.5), color: { r: 0, g: 0.5, b: 1 } }],
            },
          ),
        ],
      }),
    );
    expect(tinted.variants[0]?.layers['']?.fills).toEqual([
      { type: 'SOLID', color: { r: 0, g: 127.5, b: 255, a: 255 }, opacity: 0.5 },
    ]);
  });

  it('숨긴 레이어는 넣지 않는다', () => {
    expect(first?.layers).not.toHaveProperty('icon');
  });

  it('글자 레이어는 글자 크기·줄 높이·굵기를 적고 모서리는 없다', () => {
    expect(first?.layers.label).toMatchObject({
      cornerRadius: null,
      text: {
        fontSize: 14,
        lineHeight: { unit: 'PIXELS', value: 20 },
        fontWeight: 400,
        autoResize: 'WIDTH_AND_HEIGHT',
      },
    });
  });

  it('인스턴스 안쪽의 보이는 레이어는 넣고 자산 안쪽은 넣지 않는다', () => {
    const inner: NodeData = node({
      key: 'button/label',
      type: 'TEXT',
      isInsideInstance: true,
      text: text(),
      fills: [solid('Black/89')],
      box: { x: 110, y: 210, width: 30, height: 20 },
    });
    const icon: NodeData = node({
      key: 'button/icon',
      type: 'INSTANCE',
      isInsideInstance: true,
      asset: iconAsset({ measuredColor: { r: 1, g: 1, b: 1 } }),
      instance: instance(),
    });
    const button = node({
      key: 'button',
      type: 'INSTANCE',
      instance: instance(),
      children: [inner, icon],
    });
    const nested = buildComponentLayout(
      component({ variants: [variant('V', {}, { ...buttonRoot(), children: [button] })] }),
    );
    const layers = nested.variants[0]?.layers ?? {};
    expect(Object.keys(layers)).toEqual(['', 'button', 'button/label', 'button/icon']);
    expect(layers['button/label']).toMatchObject({ x: 10, y: 10 });
    expect(layers['button/icon']?.asset).toEqual({
      file: 'icons/ic_fluent_add_20_regular',
      color: { r: 255, g: 255, b: 255, a: 255 },
    });
  });

  it('이미지 칠의 맞춤 방식을 CSS 이름으로 옮긴다(FILL은 cover, FIT은 contain)', () => {
    const image = node({
      key: 'photo',
      type: 'RECTANGLE',
      fills: [
        { type: 'IMAGE', isVisible: true, blendMode: 'NORMAL', opacity: 1, scaleMode: 'FILL' },
        { type: 'IMAGE', isVisible: true, blendMode: 'NORMAL', opacity: 0.5, scaleMode: 'FIT' },
      ],
    });
    const result = buildComponentLayout(
      component({ variants: [variant('V', {}, { ...buttonRoot(), children: [image] })] }),
    );
    expect(result.variants[0]?.layers.photo?.fills).toEqual([
      { type: 'IMAGE', fit: 'cover', opacity: 1 },
      { type: 'IMAGE', fit: 'contain', opacity: 0.5 },
    ]);
  });

  it('그림자는 피그마가 돌려준 최종 값을 적는다', () => {
    const box = node({
      key: 'box',
      type: 'FRAME',
      effects: [
        {
          type: 'DROP_SHADOW',
          isVisible: true,
          blendMode: 'NORMAL',
          shadow: {
            color: { r: 0, g: 0, b: 0, a: 0.2 },
            offsetX: 0,
            offsetY: 8,
            radius: 16,
            spread: 0,
          },
        },
      ],
    });
    const result = buildComponentLayout(
      component({ variants: [variant('V', {}, { ...buttonRoot(), children: [box] })] }),
    );
    expect(result.variants[0]?.layers.box?.shadows).toEqual([
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 51 },
        offsetX: 0,
        offsetY: 8,
        radius: 16,
        spread: 0,
      },
    ]);
  });
});

// @codocs [[디자인 시스템:생성 결과 검증]]
// @codocs [[디자인 시스템:회전 구현]]
describe('검증 자료: 움직임', () => {
  const timeline = timelineLayout({
    owner: { kind: 'asset', layer: 'arc' },
    isLooping: true,
    duration: 2,
    tracks: [
      {
        layer: 'arc',
        assetLayer: '',
        property: 'ROTATION',
        operation: 'SET',
        baseValue: 0,
        keyframes: [
          { time: 0, value: 0, easing: { type: 'LINEAR', bezier: null } },
          { time: 2, value: 360, easing: { type: 'LINEAR', bezier: null } },
        ],
      },
      {
        layer: 'arc',
        assetLayer: 'path',
        property: 'PATH_TRIM_END',
        operation: 'SET',
        baseValue: 0.25,
        keyframes: [
          {
            time: 0.5,
            value: 0.75,
            easing: { type: 'CUSTOM_CUBIC_BEZIER', bezier: { x1: 0, y1: 0, x2: 0, y2: 1 } },
          },
        ],
      },
    ],
  });

  it('초를 밀리초로 바꾸고 반복 여부는 그대로 둔다', () => {
    expect(timeline).toMatchObject({ durationMs: 2000, isLooping: true });
    expect(timeline.tracks[1]?.keyframes[0]?.offsetMs).toBe(500);
  });

  it('회전은 부호를 뒤집어 CSS 방향으로 적는다', () => {
    expect(timeline.tracks[0]?.keyframes.map((keyframe) => keyframe.value)).toEqual([0, -360]);
  });

  it('선 그리기 시작·끝은 선 길이를 1로 본 비율 그대로이고 이징 곡선 숫자도 그대로다', () => {
    expect(timeline.tracks[1]).toMatchObject({
      baseValue: 0.25,
      keyframes: [
        {
          value: 0.75,
          easing: { type: 'CUSTOM_CUBIC_BEZIER', bezier: { x1: 0, y1: 0, x2: 0, y2: 1 } },
        },
      ],
    });
  });
});
