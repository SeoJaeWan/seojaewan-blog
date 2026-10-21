import type { LayerNodeInput, LayerPaintInput } from './layer-export';

// layer-export 테스트용 피그마 노드 트리. 페이지 기준 좌표이고 변형 루트는 (100, 200)에 있다.

const black = { r: 0, g: 0, b: 0 };

/**
 * 변수에 묶인 단색 칠을 만든다.
 * @param variable 변수 이름
 * @param opacity 칠 불투명도
 * @returns 칠
 */
export function boundPaint(variable: string, opacity = 1): LayerPaintInput {
  return { type: 'SOLID', color: black, opacity, blendMode: 'NORMAL', variable };
}

/**
 * 노드를 만든다. 지정하지 않은 값은 보이는 빈 프레임이다.
 * @param overrides 바꿀 값
 * @returns 노드
 */
export function node(
  overrides: Partial<LayerNodeInput> & Pick<LayerNodeInput, 'name'>,
): LayerNodeInput {
  return {
    id: overrides.name,
    type: 'FRAME',
    visible: true,
    box: { x: 100, y: 200, width: 10, height: 10 },
    ...overrides,
  };
}

/** 아이콘 인스턴스(안은 벡터 하나) */
export const iconNode = node({
  name: 'icon',
  type: 'INSTANCE',
  component: 'ic_fluent_open_20_regular',
  box: { x: 112, y: 208, width: 16, height: 16 },
  children: [
    node({
      name: 'glyph',
      type: 'VECTOR',
      box: { x: 114, y: 210, width: 12, height: 12 },
      fills: [boundPaint('text-fill/primary', 0.8956)],
    }),
  ],
});

/** 글자 */
export const labelNode = node({
  name: 'label',
  type: 'TEXT',
  box: { x: 147.5, y: 206, width: 25, height: 20 },
  renderBox: { x: 148.4844, y: 209.9531, width: 22.6816, height: 12.1816 },
  fills: [boundPaint('text-fill/primary', 0.8956)],
  text: {
    characters: '버튼',
    autoResize: 'WIDTH_AND_HEIGHT',
    alignHorizontal: 'LEFT',
    segments: [
      {
        fontFamily: 'Pretendard',
        fontStyle: 'SemiBold',
        fontSize: 14,
        lineHeight: { unit: 'PIXELS', value: 20 },
        letterSpacing: { unit: 'PERCENT', value: 0 },
        textStyle: 'Hangul/Body Strong',
      },
    ],
  },
});

/** 변형 루트 */
export const rootNode = node({
  name: 'Style=Accent, State=Rest',
  type: 'COMPONENT',
  box: { x: 100, y: 200, width: 120, height: 32 },
  layoutMode: 'HORIZONTAL',
  padding: { top: 6, right: 12, bottom: 6, left: 12 },
  itemSpacing: 8,
  primaryAxisAlignItems: 'CENTER',
  cornerRadius: 4,
  fills: [boundPaint('accent-fill/default')],
  strokes: [
    {
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      blendMode: 'NORMAL',
      stops: [
        {
          position: 0.9067,
          color: { r: 1, g: 1, b: 1, a: 0.08 },
          variable: 'control-stroke/on-accent-default',
        },
        {
          position: 1,
          color: { r: 0, g: 0, b: 0, a: 0.4 },
          variable: 'control-stroke/on-accent-secondary',
        },
      ],
    },
  ],
  strokeWeight: 1,
  strokeAlign: 'INSIDE',
  strokeStyle: 'Elevation/Accent Control Border',
  effects: [],
  children: [
    iconNode,
    labelNode,
    node({ name: 'hidden', type: 'TEXT', visible: false }),
    node({
      name: 'group',
      type: 'GROUP',
      children: [
        node({
          name: 'content',
          box: { x: 100, y: 200, width: 20, height: 20 },
          children: [
            node({ name: 'label', type: 'TEXT', box: { x: 102, y: 202, width: 5, height: 5 } }),
          ],
        }),
        node({
          name: 'photo',
          type: 'RECTANGLE',
          fills: [
            { type: 'IMAGE', opacity: 1, blendMode: 'NORMAL', imageHash: 'abc', scaleMode: 'FILL' },
          ],
        }),
      ],
    }),
    node({
      name: 'logo',
      children: [
        node({ name: 'mark', type: 'VECTOR', fills: [boundPaint('accent-fill/default')] }),
        node({ name: 'word', type: 'TEXT' }),
      ],
    }),
  ],
});
