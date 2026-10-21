// 피그마 플러그인이 내보내는 figma/tokens.json의 일부를 본뜬 테스트 데이터다.
// 값은 피그마 파일(XV9Y1UT5UH4tC5hSqLVipZ)의 실제 Variables와 스타일에서 골랐다. 실제 내보내기 결과가 아니다.

function figma(collection: string, scopes: readonly string[] = ['ALL_SCOPES']) {
  return { 'com.figma': { collection, scopes } };
}

function primitive(value: string) {
  return { $type: 'color', $value: value, $extensions: figma('Primitive') };
}

function semantic(alias: string) {
  return { $type: 'color', $value: alias, $extensions: figma('Semantic') };
}

function dimension(value: number) {
  return { $type: 'dimension', $value: { value, unit: 'px' }, $extensions: figma('Dimension') };
}

function typography(type: string, value: unknown) {
  return { $type: type, $value: value, $extensions: figma('Typography') };
}

function motion(type: string, value: unknown) {
  return { $type: type, $value: value, $extensions: figma('Motion') };
}

function textStyle(family: string, size: string, weight: string) {
  return {
    $type: 'typography',
    $value: {
      fontFamily: `{font.family.${family}}`,
      fontWeight: `{font.weight.${weight}}`,
      fontSize: `{font.size.${size}}`,
      lineHeight: `{font.line-height.${size}}`,
      letterSpacing: { value: 0, unit: '%' },
    },
  };
}

export const TOKENS_FIXTURE = {
  color: {
    black: {
      'alpha-e4': primitive('#000000e4'),
      'alpha-0a': primitive('#0000000a'),
      'alpha-0f': primitive('#0000000f'),
      'alpha-29': primitive('#00000029'),
    },
    blue: { 'dark-1': primitive('#005fb8') },
    gray: { f9f9f9: primitive('#f9f9f9'), 'fcfcfc-ad9': primitive('#fcfcfcd9') },
    red: { 'dark-1': primitive('#c42b1c') },
    white: { solid: primitive('#ffffff') },
  },
  'text-fill': { primary: semantic('{color.black.alpha-e4}') },
  'accent-fill': { default: semantic('{color.blue.dark-1}') },
  'control-stroke': {
    default: semantic('{color.black.alpha-0f}'),
    secondary: semantic('{color.black.alpha-29}'),
  },
  'acrylic-background-fill': {
    default: semantic('{color.gray.fcfcfc-ad9}'),
    'default-fallback': semantic('{color.gray.f9f9f9}'),
  },
  spacing: { '0': dimension(0), '4': dimension(4), '12': dimension(12) },
  radius: { control: dimension(4), overlay: dimension(8), circular: dimension(9999) },
  'stroke-width': { default: dimension(1) },
  size: { control: { height: dimension(32) }, icon: { '16': dimension(16) } },
  blur: { acrylic: dimension(60) },
  opacity: { cut: { $type: 'number', $value: 50, $extensions: figma('Dimension') } },
  font: {
    family: {
      base: typography('fontFamily', 'Open Sans'),
      korean: typography('fontFamily', 'Pretendard'),
      code: typography('fontFamily', 'Cascadia Mono'),
    },
    weight: {
      regular: typography('fontWeight', 400),
      semibold: typography('fontWeight', 600),
      bold: typography('fontWeight', 700),
    },
    size: { body: typography('dimension', { value: 14, unit: 'px' }) },
    'line-height': { body: typography('dimension', { value: 20, unit: 'px' }) },
  },
  'caption-button': {
    'close-fill-hover': {
      $type: 'color',
      $value: '{color.red.dark-1}',
      $extensions: figma('Component'),
    },
  },
  motion: {
    duration: { fast: motion('duration', { value: 167, unit: 'ms' }) },
    easing: {
      'direct-entrance': motion('cubicBezier', [0, 0, 0, 1]),
      fade: motion('cubicBezier', [0, 0, 1, 1]),
    },
    scale: { 'window-enter': motion('number', 0.9599999785423279) },
  },
  style: {
    text: {
      Body: textStyle('base', 'body', 'regular'),
      'Body Strong': textStyle('base', 'body', 'semibold'),
      Code: textStyle('code', 'body', 'regular'),
      Hangul: {
        'Body Strong': textStyle('korean', 'body', 'semibold'),
        Code: textStyle('korean', 'body', 'regular'),
      },
    },
    effect: {
      Elevation: {
        Card: {
          $type: 'shadow',
          $value: [
            {
              color: '#0000000a',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
              blur: { value: 4, unit: 'px' },
              spread: { value: 0, unit: 'px' },
              inset: false,
            },
          ],
        },
        Dialog: {
          $type: 'shadow',
          $value: [
            {
              color: '#00000026',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
              blur: { value: 21, unit: 'px' },
              spread: { value: 0, unit: 'px' },
              inset: false,
            },
            {
              color: '#00000030',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 32, unit: 'px' },
              blur: { value: 64, unit: 'px' },
              spread: { value: 0, unit: 'px' },
              inset: false,
            },
          ],
        },
      },
      Material: {
        Acrylic: {
          $type: 'shadow',
          $value: [],
          $extensions: { 'com.seojaewan': { backgroundBlur: { value: 60, unit: 'px' } } },
        },
      },
      Surface: {
        'Flyout (Acrylic)': {
          $type: 'shadow',
          $value: [
            {
              color: '#00000024',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 8, unit: 'px' },
              blur: { value: 16, unit: 'px' },
              spread: { value: 0, unit: 'px' },
              inset: false,
            },
          ],
          $extensions: { 'com.seojaewan': { backgroundBlur: '{blur.acrylic}' } },
        },
      },
      Text: {
        'Desktop label shadow': {
          $type: 'shadow',
          $value: [
            {
              color: '#00000099',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 1, unit: 'px' },
              blur: { value: 2, unit: 'px' },
              spread: { value: 0, unit: 'px' },
              inset: false,
            },
          ],
        },
      },
    },
    paint: {
      Material: {
        'Acrylic Default': {
          $type: 'color',
          $value: '#fcfcfc',
          $extensions: {
            'com.seojaewan': {
              layers: [
                { type: 'SOLID', color: '#fcfcfc', opacity: 0.85, blendMode: 'LUMINOSITY' },
                { type: 'SOLID', color: '#fcfcfc', opacity: 0, blendMode: 'COLOR' },
                {
                  type: 'IMAGE',
                  opacity: 0.02,
                  blendMode: 'NORMAL',
                  imageHash: 'noise',
                  asset: 'images/noise-acrylic.png',
                  scaleMode: 'TILE',
                  scalingFactor: 1,
                },
              ],
            },
          },
        },
        'Acrylic Bound': {
          $type: 'color',
          $value: '{acrylic-background-fill.default}',
          $extensions: {
            'com.seojaewan': {
              layers: [
                {
                  type: 'SOLID',
                  color: '{acrylic-background-fill.default}',
                  opacity: 1,
                  blendMode: 'LUMINOSITY',
                },
                {
                  type: 'IMAGE',
                  opacity: 0.02,
                  blendMode: 'NORMAL',
                  imageHash: 'noise',
                  asset: 'images/noise-acrylic.png',
                  scaleMode: 'TILE',
                  scalingFactor: 1,
                },
              ],
            },
          },
        },
        'Mica Base': {
          $type: 'color',
          $value: '#f3f3f3',
          $extensions: {
            'com.seojaewan': {
              layers: [
                { type: 'SOLID', color: '#f3f3f3', opacity: 1, blendMode: 'LUMINOSITY' },
                { type: 'SOLID', color: '#f3f3f3', opacity: 0.5, blendMode: 'COLOR' },
              ],
            },
          },
        },
        Fallback: {
          'Acrylic Default': {
            $type: 'color',
            $value: '{acrylic-background-fill.default-fallback}',
          },
        },
      },
      Elevation: {
        'Control Border': {
          $type: 'gradient',
          $value: [
            { color: '{control-stroke.default}', position: 0.9058 },
            { color: '{control-stroke.secondary}', position: 1 },
          ],
          $extensions: {
            'com.seojaewan': {
              layers: [
                {
                  type: 'GRADIENT_LINEAR',
                  gradientStops: [
                    { color: '{control-stroke.default}', position: 0.9058 },
                    { color: '{control-stroke.secondary}', position: 1 },
                  ],
                  gradientTransform: [
                    [0, 1, 0],
                    [-1, 0, 1],
                  ],
                  opacity: 1,
                  blendMode: 'NORMAL',
                },
              ],
            },
          },
        },
        'Text Control Border Focused': {
          $type: 'gradient',
          $value: [
            { color: '{control-stroke.default}', position: 0.9688 },
            { color: '{accent-fill.default}', position: 0.9689 },
          ],
        },
      },
    },
  },
} as const;
