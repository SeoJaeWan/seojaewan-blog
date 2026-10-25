import type {
  DesignTokensInput,
  EffectStyleInput,
  PaintStyleInput,
  TextStyleInput,
  VariableInput,
} from './design-tokens';

// 실제 피그마 파일(XV9Y1UT5UH4tC5hSqLVipZ)에서 읽은 값을 줄여 옮긴 테스트 데이터

/**
 * 테스트용 변수를 만든다.
 * @param name 변수 이름
 * @param resolvedType 피그마 변수 타입
 * @param value 기본 모드 값
 * @param collection 컬렉션 이름
 * @returns 변수 입력
 */
export function variable(
  name: string,
  resolvedType: string,
  value: VariableInput['value'],
  collection = 'Primitive',
): VariableInput {
  return {
    id: `VariableID:${name}`,
    name,
    collection,
    resolvedType,
    scopes: ['ALL_SCOPES'],
    value,
  };
}

/**
 * 변수를 가리키는 별칭을 만든다.
 * @param name 가리킬 변수 이름
 * @returns 별칭
 */
export function aliasTo(name: string): { type: 'VARIABLE_ALIAS'; id: string } {
  return { type: 'VARIABLE_ALIAS', id: `VariableID:${name}` };
}

export const variables: VariableInput[] = [
  variable('color/gray/f9f9f9', 'COLOR', { r: 0.976, g: 0.976, b: 0.976, a: 1 }),
  variable('color/black/a-14', 'COLOR', { r: 0, g: 0, b: 0, a: 0.14 }),
  variable('layer-fill/default', 'COLOR', aliasTo('color/gray/f9f9f9'), 'Semantic'),
  variable('spacing/4', 'FLOAT', 4, 'Dimension'),
  variable('blur/acrylic', 'FLOAT', 60, 'Dimension'),
  variable('opacity/cut', 'FLOAT', 0.4000000059604645, 'Dimension'),
  variable('motion/duration/fast', 'FLOAT', 167, 'Motion'),
  variable('motion/delay/tooltip', 'FLOAT', 500, 'Motion'),
  variable('motion/scale/pressed', 'FLOAT', 0.96, 'Motion'),
  variable('font/family/base', 'STRING', 'Open Sans', 'Typography'),
  variable('font/weight/regular', 'STRING', 'Regular', 'Typography'),
  variable('font/weight/semibold', 'STRING', 'SemiBold', 'Typography'),
  variable('font/weight/bold', 'STRING', 'Bold', 'Typography'),
  variable('font/size/body', 'FLOAT', 14, 'Typography'),
  variable('font/line-height/body', 'FLOAT', 20, 'Typography'),
  variable('motion/easing/point-to-point', 'STRING', 'cubic-bezier(0.55, 0.55, 0, 1)', 'Motion'),
  variable(
    'motion/easing/direct-entrance',
    'EASING',
    {
      type: 'EASING',
      easingType: 'CUSTOM_CUBIC_BEZIER',
      cubicBezier: { x1: 0, y1: 0, x2: 0, y2: 1 },
    },
    'Motion',
  ),
  variable('motion/easing/fade', 'EASING', { type: 'EASING', easingType: 'LINEAR' }, 'Motion'),
];

export const bodyStyle: TextStyleInput = {
  name: 'Body',
  fontFamily: 'Open Sans',
  fontStyle: 'Regular',
  fontSize: 14,
  lineHeight: { unit: 'PIXELS', value: 20 },
  letterSpacing: { unit: 'PERCENT', value: 0 },
  boundVariables: {
    fontFamily: aliasTo('font/family/base'),
    fontStyle: aliasTo('font/weight/regular'),
    fontSize: aliasTo('font/size/body'),
    lineHeight: aliasTo('font/line-height/body'),
  },
};

export const flyoutEffectStyle: EffectStyleInput = {
  name: 'Surface/Flyout (Acrylic)',
  effects: [
    {
      type: 'BACKGROUND_BLUR',
      visible: true,
      radius: 60,
      boundVariables: { radius: aliasTo('blur/acrylic') },
    },
    {
      type: 'DROP_SHADOW',
      visible: true,
      color: { r: 0, g: 0, b: 0, a: 0.14000000059604645 },
      offsetX: 0,
      offsetY: 8,
      radius: 16,
      spread: 0,
      boundVariables: {},
    },
  ],
};

export const acrylicPaintStyle: PaintStyleInput = {
  name: 'Material/Acrylic Default',
  paints: [
    {
      type: 'SOLID',
      visible: true,
      opacity: 0.8500000238418579,
      blendMode: 'NORMAL',
      color: { r: 0.976, g: 0.976, b: 0.976 },
      boundVariables: { color: aliasTo('layer-fill/default') },
    },
    {
      type: 'IMAGE',
      visible: true,
      opacity: 0.019999999552965164,
      blendMode: 'NORMAL',
      imageHash: 'a563f96d0f0af894df83be986ec4e7a84096fd54',
      scaleMode: 'TILE',
      scalingFactor: 1,
    },
  ],
};

export const fallbackPaintStyle: PaintStyleInput = {
  name: 'Material/Fallback/Acrylic Default',
  paints: [
    {
      type: 'SOLID',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      color: { r: 0.976, g: 0.976, b: 0.976 },
      boundVariables: { color: aliasTo('layer-fill/default') },
    },
  ],
};

export const controlBorderPaintStyle: PaintStyleInput = {
  name: 'Elevation/Control Border',
  paints: [
    {
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      gradientStops: [
        {
          color: { r: 0, g: 0, b: 0, a: 0.14 },
          position: 0.8999999761581421,
          boundVariables: { color: aliasTo('color/black/a-14') },
        },
        {
          color: { r: 0, g: 0, b: 0, a: 0.14 },
          position: 1,
          boundVariables: { color: aliasTo('color/black/a-14') },
        },
      ],
      gradientTransform: [
        [0, 1, 0],
        [-0.0416666679084301, 0, 0.5208333134651184],
      ],
    },
  ],
};

export const wallpaperPaintStyle: PaintStyleInput = {
  name: 'Wallpaper/Bloom',
  paints: [
    {
      type: 'IMAGE',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      imageHash: '32a4f2aead9726b13a6b06d1170070a036adac8e',
      scaleMode: 'FILL',
      scalingFactor: 0.5,
    },
  ],
};

/**
 * 테스트용 변환 입력을 만든다. 별칭 이름표는 변수 목록에서 만든다.
 * @param overrides 바꿀 항목
 * @returns 변환 입력
 */
export function tokensInput(overrides: Partial<DesignTokensInput> = {}): DesignTokensInput {
  const list = overrides.variables ?? variables;
  return {
    variables: list,
    aliasNames: Object.fromEntries(list.map((item) => [item.id, item.name])),
    textStyles: [],
    effectStyles: [],
    paintStyles: [],
    imageAssets: {
      a563f96d0f0af894df83be986ec4e7a84096fd54: 'images/noise-acrylic.png',
      '32a4f2aead9726b13a6b06d1170070a036adac8e': 'images/wallpaper-bloom.png',
    },
    ...overrides,
  };
}
