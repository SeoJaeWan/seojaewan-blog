import type { ComponentLayout, LayerMeasure } from '../../src/figma-export/component-layout.ts';
import type {
  BoxLayer,
  ComponentSchema,
  LayerBase,
  MotionTimeline,
  VariantSchema,
} from '../../src/figma-export/component-schema.ts';

// 생성기 시험 데이터다. figma-export.fixture.ts(Button, MessageBox)에 없는 움직임(`Motion`)과 기기(`Device`) 변형을 본떴다.
// Spinner: 내용 전체를 감싼 `motion` 레이어가 돌고 안쪽 점이 나타난다. 모바일에서는 안쪽 여백이 넓다.

function base(key: string, name: string, overrides: Partial<LayerBase>): LayerBase {
  return {
    key,
    name,
    nodeId: `90:${key}`,
    isVisible: true,
    propertyRefs: {},
    width: { value: 0 },
    height: { value: 0 },
    sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    aspectRatio: null,
    placement: {
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
      x: 0,
      y: 0,
    },
    rotation: 0,
    opacity: { value: 1 },
    ...overrides,
  };
}

function box(layer: LayerBase, overrides: Partial<BoxLayer>): BoxLayer {
  return {
    ...layer,
    fills: { paints: [] },
    stroke: null,
    cornerRadius: {
      topLeft: { value: 0 },
      topRight: { value: 0 },
      bottomRight: { value: 0 },
      bottomLeft: { value: 0 },
    },
    effectStyle: null,
    kind: 'box',
    figmaType: 'FRAME',
    layout: null,
    isClippingContent: false,
    overflowDirection: 'NONE',
    children: [],
    ...overrides,
  };
}

const spin: MotionTimeline = {
  owner: { kind: 'variant' },
  isLooping: true,
  duration: 1,
  tracks: [
    {
      layer: 'motion',
      assetLayer: null,
      property: 'ROTATION',
      operation: 'SET',
      baseValue: 0,
      keyframes: [
        { time: 0, value: 0, easing: { type: 'LINEAR', bezier: null } },
        { time: 1, value: -360, easing: { type: 'LINEAR', bezier: null } },
      ],
    },
    {
      layer: 'motion/dot',
      assetLayer: null,
      property: 'OPACITY',
      operation: 'SET',
      baseValue: 1,
      keyframes: [
        { time: 0, value: 0.2, easing: { type: 'LINEAR', bezier: null } },
        {
          time: 0.5,
          value: 1,
          easing: { type: 'CUSTOM_CUBIC_BEZIER', bezier: { x1: 0, y1: 0, x2: 0.58, y2: 1 } },
        },
      ],
    },
    {
      layer: 'motion/dot',
      assetLayer: null,
      property: 'TRANSLATION_Y',
      operation: 'SET',
      baseValue: 0,
      keyframes: [
        { time: 0, value: 0, easing: { type: 'LINEAR', bezier: null } },
        { time: 1, value: 4, easing: { type: 'LINEAR', bezier: null } },
      ],
    },
  ],
};

function spinnerVariant(motion: 'None' | 'Spin', device: 'Desktop' | 'Mobile'): VariantSchema {
  const name = `Motion=${motion}, Device=${device}`;
  const padding = {
    variable: { collection: 'Dimension', name: device === 'Desktop' ? 'spacing/sm' : 'spacing/md' },
  };
  const dot = box(base('motion/dot', 'dot', { width: { value: 8 }, height: { value: 8 } }), {
    fills: {
      paints: [
        {
          type: 'SOLID',
          color: { variable: { collection: 'Color', name: 'Black/89' } },
          opacity: 0.894,
        },
      ],
    },
  });
  const wrapper = box(
    base('motion', 'motion', {
      width: { value: 40 },
      height: { value: 40 },
      sizing: { horizontal: 'FILL', vertical: 'FILL' },
    }),
    {
      fills: {
        paints: [
          {
            type: 'SOLID',
            color: { variable: { collection: 'Color', name: 'Gray/4' } },
            opacity: 1,
          },
        ],
      },
      layout: {
        mode: 'HORIZONTAL',
        wrap: 'NO_WRAP',
        primaryAxisAlign: 'MIN',
        counterAxisAlign: 'MIN',
        counterAxisAlignContent: 'AUTO',
        padding: { top: padding, right: padding, bottom: padding, left: padding },
        itemSpacing: { value: 0 },
        counterAxisSpacing: null,
        isReversingZIndex: false,
      },
      children: [dot],
    },
  );
  const root = box(
    base('', name, { width: { value: 40 }, height: { value: 40 }, placement: null }),
    {
      figmaType: 'COMPONENT',
      layout: {
        mode: 'HORIZONTAL',
        wrap: 'NO_WRAP',
        primaryAxisAlign: 'MIN',
        counterAxisAlign: 'MIN',
        counterAxisAlignContent: 'AUTO',
        padding: {
          top: { value: 0 },
          right: { value: 0 },
          bottom: { value: 0 },
          left: { value: 0 },
        },
        itemSpacing: { value: 0 },
        counterAxisSpacing: null,
        isReversingZIndex: false,
      },
      children: [wrapper],
    },
  );
  return {
    name,
    nodeId: `90:${name}`,
    values: { Motion: motion, Device: device },
    root,
    transitions: [],
    motion: motion === 'Spin' ? [spin] : [],
  };
}

export const spinnerSchema = {
  formatVersion: 1,
  name: 'Spinner',
  nodeId: '90:0',
  page: 'Controls',
  description: '시험용 회전 표시.',
  behavior: null,
  properties: [
    { type: 'VARIANT', key: 'Motion', name: 'Motion', options: ['None', 'Spin'], default: 'None' },
    {
      type: 'VARIANT',
      key: 'Device',
      name: 'Device',
      options: ['Desktop', 'Mobile'],
      default: 'Desktop',
    },
  ],
  variants: [
    spinnerVariant('None', 'Desktop'),
    spinnerVariant('Spin', 'Desktop'),
    spinnerVariant('None', 'Mobile'),
  ],
} satisfies ComponentSchema;

function measure(
  box: { x: number; y: number; width: number; height: number },
  overrides: Partial<LayerMeasure>,
): LayerMeasure {
  return {
    ...box,
    opacity: 1,
    fills: [],
    stroke: null,
    cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    shadows: [],
    text: null,
    asset: null,
    ...overrides,
  };
}

function spinnerLayers(inset: number): Record<string, LayerMeasure> {
  return {
    '': measure({ x: 0, y: 0, width: 40, height: 40 }, {}),
    motion: measure(
      { x: 0, y: 0, width: 40, height: 40 },
      { fills: [{ type: 'SOLID', color: { r: 243, g: 243, b: 243, a: 255 }, opacity: 1 }] },
    ),
    'motion/dot': measure(
      { x: inset, y: inset, width: 8, height: 8 },
      { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 255 }, opacity: 0.894 }] },
    ),
  };
}

export const spinnerLayout = {
  formatVersion: 1,
  name: 'Spinner',
  variants: [
    {
      name: 'Motion=None, Device=Desktop',
      width: 40,
      height: 40,
      layers: spinnerLayers(8),
      motion: [],
    },
    {
      name: 'Motion=Spin, Device=Desktop',
      width: 40,
      height: 40,
      layers: spinnerLayers(8),
      motion: [
        {
          owner: { kind: 'variant' },
          isLooping: true,
          durationMs: 1000,
          tracks: [
            {
              layer: 'motion',
              assetLayer: null,
              property: 'ROTATION',
              operation: 'SET',
              baseValue: 0,
              keyframes: [
                { offsetMs: 0, value: 0, easing: { type: 'LINEAR', bezier: null } },
                { offsetMs: 1000, value: 360, easing: { type: 'LINEAR', bezier: null } },
              ],
            },
            {
              layer: 'motion/dot',
              assetLayer: null,
              property: 'OPACITY',
              operation: 'SET',
              baseValue: 1,
              keyframes: [
                { offsetMs: 0, value: 0.2, easing: { type: 'LINEAR', bezier: null } },
                {
                  offsetMs: 500,
                  value: 1,
                  easing: {
                    type: 'CUSTOM_CUBIC_BEZIER',
                    bezier: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
                  },
                },
              ],
            },
            {
              layer: 'motion/dot',
              assetLayer: null,
              property: 'TRANSLATION_Y',
              operation: 'SET',
              baseValue: 0,
              keyframes: [
                { offsetMs: 0, value: 0, easing: { type: 'LINEAR', bezier: null } },
                { offsetMs: 1000, value: 4, easing: { type: 'LINEAR', bezier: null } },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Motion=None, Device=Mobile',
      width: 40,
      height: 40,
      layers: spinnerLayers(12),
      motion: [],
    },
  ],
} satisfies ComponentLayout;
