// tokens-css.test.ts가 쓰는 작은 tokens.json이다. 플러그인이 내보내는 모양(DTCG + 확장 필드)을 따른다.

const FIGMA = 'com.figma';
const SEOJAEWAN = 'com.seojaewan';

/**
 * 변수 토큰을 만든다.
 * @param type `$type`
 * @param value `$value`
 * @param scopes 피그마 변수 범위
 * @returns 토큰
 */
function variable(type: string, value: unknown, scopes: string[] = []): Record<string, unknown> {
  return { $type: type, $value: value, $extensions: { [FIGMA]: { scopes } } };
}

/**
 * Primitive 모음의 색 변수를 만든다.
 * @param value 16진수 색
 * @returns 토큰
 */
function primitive(value: string): Record<string, unknown> {
  return {
    $type: 'color',
    $value: value,
    $extensions: { [FIGMA]: { collection: 'Primitive', scopes: [] } },
  };
}

/**
 * px 길이 값을 만든다.
 * @param value 숫자
 * @returns `{unit, value}`
 */
function px(value: number): Record<string, unknown> {
  return { unit: 'px', value };
}

/**
 * 그림자 층을 만든다.
 * @param y 세로 거리
 * @param blur 흐림
 * @param color 색
 * @returns 그림자 층
 */
function shadow(y: number, blur: number, color: string): Record<string, unknown> {
  return { offsetX: px(0), offsetY: px(y), blur: px(blur), spread: px(0), color, inset: false };
}

export const TOKENS_FIXTURE = {
  color: {
    black: {
      'alpha-0f': primitive('#0000000F'),
      'alpha-66': primitive('#00000066'),
    },
    white: { 'alpha-14': primitive('#ffffff14') },
    gray: { f9f9f9: primitive('#f9f9f9') },
  },
  'text-fill': { primary: variable('color', '{color.black.alpha-66}', ['TEXT_FILL']) },
  'control-stroke': {
    default: variable('color', '{color.black.alpha-0f}', ['STROKE_COLOR']),
    'on-accent-default': variable('color', '{color.white.alpha-14}', ['STROKE_COLOR']),
    'on-accent-secondary': variable('color', '{color.black.alpha-66}', ['STROKE_COLOR']),
  },
  'acrylic-background-fill': { default: variable('color', '{color.gray.f9f9f9}') },
  spacing: { '2': variable('dimension', px(2)), '10': variable('dimension', px(10)) },
  size: { control: { height: variable('dimension', px(32)) } },
  'stroke-width': { default: variable('dimension', px(1)) },
  blur: { acrylic: variable('dimension', px(60)) },
  opacity: { cut: variable('number', 50, ['OPACITY']) },
  motion: {
    duration: { fast: variable('duration', { unit: 'ms', value: 167 }) },
    easing: { fade: variable('cubicBezier', [0, 0, 1, 1]) },
    scale: { enter: variable('number', 0.9599999785) },
  },
  font: {
    family: {
      base: variable('fontFamily', 'Open Sans'),
      korean: variable('fontFamily', 'Pretendard'),
    },
    size: { body: variable('dimension', px(14)) },
    'line-height': { body: variable('dimension', px(20)) },
    weight: { regular: variable('fontWeight', 400) },
  },
  style: {
    effect: {
      Elevation: { Flyout: { $type: 'shadow', $value: [shadow(8, 16, '#00000024')] } },
      Material: {
        Acrylic: {
          $type: 'shadow',
          $value: [],
          $extensions: { [SEOJAEWAN]: { backgroundBlur: '{blur.acrylic}' } },
        },
      },
      Surface: {
        'Flyout (Acrylic)': {
          $type: 'shadow',
          $value: [shadow(8, 16, '#00000024')],
          $extensions: { [SEOJAEWAN]: { backgroundBlur: '{blur.acrylic}' } },
        },
      },
    },
    paint: {
      Elevation: {
        'Accent Control Border': {
          $type: 'gradient',
          $value: [
            { color: '{control-stroke.on-accent-default}', position: 0.9067 },
            { color: '{control-stroke.on-accent-secondary}', position: 1 },
          ],
        },
      },
      Material: {
        'Acrylic Default': {
          $type: 'color',
          $value: '{acrylic-background-fill.default}',
          $extensions: {
            [SEOJAEWAN]: {
              layers: [
                { type: 'SOLID', color: '{acrylic-background-fill.default}', opacity: 0.85 },
                { type: 'IMAGE', asset: 'images/noise-acrylic.png', opacity: 0.02 },
              ],
            },
          },
        },
        Fallback: {
          'Acrylic Default': { $type: 'color', $value: '{acrylic-background-fill.default}' },
        },
      },
    },
    text: {
      Body: {
        $type: 'typography',
        $value: {
          fontFamily: '{font.family.base}',
          fontSize: '{font.size.body}',
          fontWeight: '{font.weight.regular}',
          letterSpacing: { unit: '%', value: 0 },
          lineHeight: '{font.line-height.body}',
        },
      },
      Hangul: {
        Body: {
          $type: 'typography',
          $value: {
            fontFamily: '{font.family.korean}',
            fontSize: '{font.size.body}',
            fontWeight: '{font.weight.regular}',
            letterSpacing: { unit: '%', value: 0 },
            lineHeight: '{font.line-height.body}',
          },
        },
      },
    },
  },
} as const;
