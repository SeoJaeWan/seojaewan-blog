import { describe, expect, it } from 'vitest';

import { aliasReference, buildDesignTokens, parseCubicBezier } from './design-tokens';
import {
  acrylicPaintStyle,
  aliasTo,
  bodyStyle,
  controlBorderPaintStyle,
  fallbackPaintStyle,
  flyoutEffectStyle,
  tokensInput,
  variable,
  wallpaperPaintStyle,
} from './design-tokens.fixture';
import type { JsonObject, JsonValue } from './stable-json';

/**
 * 토큰 트리에서 경로의 값을 꺼낸다.
 * @param tree 토큰 트리
 * @param path 점으로 나눈 경로
 * @returns 그 경로의 값
 */
function at(tree: JsonObject, path: string[]): JsonValue | undefined {
  let current: JsonValue | undefined = tree;
  for (const key of path) {
    current =
      current !== null && typeof current === 'object' && !Array.isArray(current)
        ? current[key]
        : undefined;
  }
  return current;
}

// @codocs [[피그마 연동:토큰 생성]]
describe('Variables를 DTCG 토큰으로 내보낸다', () => {
  const { tokens } = buildDesignTokens(tokensInput());

  it('변수 이름을 /로 나눈 경로에 $type, $value, 컬렉션과 scopes 확장 필드를 둔다', () => {
    expect(at(tokens, ['color', 'gray', 'f9f9f9'])).toEqual({
      $type: 'color',
      $value: '#f9f9f9',
      $extensions: { 'com.figma': { collection: 'Primitive', scopes: ['ALL_SCOPES'] } },
    });
  });

  it('별칭은 풀지 않고 가리키는 변수 경로를 {a.b.c}로 남긴다', () => {
    expect(at(tokens, ['layer-fill', 'default', '$value'])).toBe('{color.gray.f9f9f9}');
    expect(aliasReference('text-fill/primary')).toBe('{text-fill.primary}');
  });

  it('알파가 1보다 작은 색은 #rrggbbaa다', () => {
    expect(at(tokens, ['color', 'black', 'a-14', '$value'])).toBe('#00000024');
  });

  it('motion/duration·motion/delay FLOAT는 ms duration이다', () => {
    expect(at(tokens, ['motion', 'duration', 'fast'])).toMatchObject({
      $type: 'duration',
      $value: { value: 167, unit: 'ms' },
    });
    expect(at(tokens, ['motion', 'delay', 'tooltip', '$type'])).toBe('duration');
  });

  it('opacity·motion/scale FLOAT는 number이고 float32 잡음을 정리한다', () => {
    expect(at(tokens, ['opacity', 'cut'])).toMatchObject({ $type: 'number', $value: 0.4 });
    expect(at(tokens, ['motion', 'scale', 'pressed', '$type'])).toBe('number');
  });

  it('그 밖의 FLOAT는 px dimension이다', () => {
    expect(at(tokens, ['spacing', '4'])).toMatchObject({
      $type: 'dimension',
      $value: { value: 4, unit: 'px' },
    });
  });

  it('font/family는 fontFamily, font/weight는 숫자 fontWeight다', () => {
    expect(at(tokens, ['font', 'family', 'base'])).toMatchObject({
      $type: 'fontFamily',
      $value: 'Open Sans',
    });
    expect(at(tokens, ['font', 'weight', 'regular', '$value'])).toBe(400);
    expect(at(tokens, ['font', 'weight', 'semibold', '$value'])).toBe(600);
    expect(at(tokens, ['font', 'weight', 'bold', '$value'])).toBe(700);
  });

  it('motion/easing EASING 변수는 곡선이면 제어점 네 숫자, 직선(LINEAR)이면 [0,0,1,1]인 cubicBezier다', () => {
    expect(at(tokens, ['motion', 'easing', 'direct-entrance'])).toMatchObject({
      $type: 'cubicBezier',
      $value: [0, 0, 0, 1],
    });
    expect(at(tokens, ['motion', 'easing', 'fade'])).toMatchObject({
      $type: 'cubicBezier',
      $value: [0, 0, 1, 1],
    });
  });

  it('motion/easing STRING 변수도 cubic-bezier 네 숫자이고 linear는 [0,0,1,1]이다', () => {
    expect(at(tokens, ['motion', 'easing', 'point-to-point'])).toMatchObject({
      $type: 'cubicBezier',
      $value: [0.55, 0.55, 0, 1],
    });
    expect(parseCubicBezier('linear')).toEqual([0, 0, 1, 1]);
    expect(parseCubicBezier('ease-in')).toBeNull();
  });

  it('곡선·직선이 아닌 EASING 값(스프링 등)과 motion/easing 밖의 EASING 변수는 모아 중단한다', () => {
    const input = tokensInput({
      variables: [
        variable('motion/easing/bouncy', 'EASING', { type: 'EASING', easingType: 'BOUNCY' }),
        variable('easing/other', 'EASING', { type: 'EASING', easingType: 'LINEAR' }),
      ],
    });
    expect(() => buildDesignTokens(input)).toThrow(/motion\/easing\/bouncy[\s\S]*easing\/other/u);
  });

  it('계약에 없는 굵기, STRING, BOOLEAN 변수는 모두 모아 중단한다', () => {
    const input = tokensInput({
      variables: [
        variable('font/weight/light', 'STRING', 'Light'),
        variable('label/greeting', 'STRING', 'hello'),
        variable('flag/on', 'BOOLEAN', true),
      ],
    });
    expect(() => buildDesignTokens(input)).toThrow(
      /font\/weight\/light[\s\S]*label\/greeting[\s\S]*flag\/on/u,
    );
  });

  it('가리키는 변수를 모르는 별칭이면 중단한다', () => {
    const input = tokensInput({ variables: [variable('a/b', 'COLOR', aliasTo('missing'))] });
    expect(() => buildDesignTokens(input)).toThrow(/missing/u);
  });

  it('같은 경로의 변수가 둘이면 중단한다', () => {
    const input = tokensInput({
      variables: [variable('size/icon', 'FLOAT', 16), variable('size/icon', 'FLOAT', 24)],
    });
    expect(() => buildDesignTokens(input)).toThrow(/size\/icon: 같은 경로/u);
  });

  it('이름이 그룹의 이름이기도 한 변수는 그 그룹의 $root 토큰이다(그룹이 먼저여도 나중이어도)', () => {
    const white = variable('color/white', 'COLOR', { r: 1, g: 1, b: 1, a: 1 });
    const white70 = variable('color/white/70', 'COLOR', { r: 1, g: 1, b: 1, a: 0.7 });
    const rootFirst = buildDesignTokens(tokensInput({ variables: [white, white70] })).tokens;
    const childFirst = buildDesignTokens(tokensInput({ variables: [white70, white] })).tokens;
    expect(at(rootFirst, ['color', 'white', '$root', '$value'])).toBe('#ffffff');
    expect(at(rootFirst, ['color', 'white', '70', '$value'])).toBe('#ffffffb3');
    expect(at(childFirst, ['color', 'white', '$root', '$value'])).toBe('#ffffff');
    expect(at(childFirst, ['color', 'white', '70', '$value'])).toBe('#ffffffb3');
    expect(at(rootFirst, ['color', 'white', '$value'])).toBeUndefined();
  });

  it('그룹의 $root 토큰을 가리키는 별칭은 {경로.$root}다', () => {
    const input = tokensInput({
      variables: [
        variable('color/blue/dark-1', 'COLOR', { r: 0, g: 0, b: 1, a: 1 }),
        variable('color/blue/dark-1/90', 'COLOR', { r: 0, g: 0, b: 1, a: 0.9 }),
        variable('text-fill/accent', 'COLOR', aliasTo('color/blue/dark-1'), 'Semantic'),
        variable('text-fill/soft', 'COLOR', aliasTo('color/blue/dark-1/90'), 'Semantic'),
      ],
    });
    const { tokens } = buildDesignTokens(input);
    expect(at(tokens, ['text-fill', 'accent', '$value'])).toBe('{color.blue.dark-1.$root}');
    expect(at(tokens, ['text-fill', 'soft', '$value'])).toBe('{color.blue.dark-1.90}');
    expect(aliasReference('color/white', true)).toBe('{color.white.$root}');
  });

  it('$root에 이미 토큰이 있는 그룹에 같은 이름의 변수가 또 오면 중단한다', () => {
    const input = tokensInput({
      variables: [
        variable('color/white', 'COLOR', { r: 1, g: 1, b: 1, a: 1 }),
        variable('color/white/70', 'COLOR', { r: 1, g: 1, b: 1, a: 0.7 }),
        variable('color/white', 'COLOR', { r: 0, g: 0, b: 0, a: 1 }),
      ],
    });
    expect(() => buildDesignTokens(input)).toThrow(/color\/white: 같은 경로/u);
  });
});

// @codocs [[피그마 연동:토큰 생성]]
describe('글자·효과·칠 스타일은 style 그룹 아래 같은 파일에 넣는다', () => {
  it('글자 스타일은 typography이고 변수에 묶인 속성은 별칭이다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ textStyles: [bodyStyle] }));
    expect(at(tokens, ['style', 'text', 'Body'])).toEqual({
      $type: 'typography',
      $value: {
        fontFamily: '{font.family.base}',
        fontWeight: '{font.weight.regular}',
        fontSize: '{font.size.body}',
        lineHeight: '{font.line-height.body}',
        letterSpacing: { value: 0, unit: '%' },
      },
    });
  });

  it('묶이지 않은 글자 속성은 직접 값(px, 숫자 굵기)이다', () => {
    const { tokens } = buildDesignTokens(
      tokensInput({
        textStyles: [
          {
            ...bodyStyle,
            fontStyle: 'SemiBold',
            letterSpacing: { unit: 'PIXELS', value: 0.5 },
            boundVariables: {},
          },
        ],
      }),
    );
    expect(at(tokens, ['style', 'text', 'Body', '$value'])).toEqual({
      fontFamily: 'Open Sans',
      fontWeight: 600,
      fontSize: { value: 14, unit: 'px' },
      lineHeight: { value: 20, unit: 'px' },
      letterSpacing: { value: 0.5, unit: 'px' },
    });
  });

  it('줄 높이가 px가 아니면 중단한다', () => {
    const input = tokensInput({
      textStyles: [{ ...bodyStyle, lineHeight: { unit: 'AUTO' }, boundVariables: {} }],
    });
    expect(() => buildDesignTokens(input)).toThrow(/AUTO/u);
  });

  it('글꼴 스타일 이름의 Italic은 기울임이고 앞부분이 굵기다(Italic만 있으면 Regular)', () => {
    const { tokens } = buildDesignTokens(
      tokensInput({
        textStyles: [
          { ...bodyStyle, name: 'Body Italic', fontStyle: 'Italic', boundVariables: {} },
          {
            ...bodyStyle,
            name: 'Body Strong Italic',
            fontStyle: 'SemiBold Italic',
            boundVariables: {},
          },
        ],
      }),
    );
    expect(at(tokens, ['style', 'text', 'Body Italic', '$value', 'fontWeight'])).toBe(400);
    expect(at(tokens, ['style', 'text', 'Body Italic', '$extensions'])).toEqual({
      'com.seojaewan': { fontStyle: 'italic' },
    });
    expect(at(tokens, ['style', 'text', 'Body Strong Italic', '$value', 'fontWeight'])).toBe(600);
    expect(at(tokens, ['style', 'text', 'Body Strong Italic', '$extensions'])).toEqual({
      'com.seojaewan': { fontStyle: 'italic' },
    });
  });

  it('굵기가 변수에 묶여 있어도 기울임은 글꼴 스타일 이름으로 정한다', () => {
    const { tokens } = buildDesignTokens(
      tokensInput({ textStyles: [{ ...bodyStyle, fontStyle: 'Italic' }] }),
    );
    expect(at(tokens, ['style', 'text', 'Body'])).toEqual({
      $type: 'typography',
      $value: {
        fontFamily: '{font.family.base}',
        fontWeight: '{font.weight.regular}',
        fontSize: '{font.size.body}',
        lineHeight: '{font.line-height.body}',
        letterSpacing: { value: 0, unit: '%' },
      },
      $extensions: { 'com.seojaewan': { fontStyle: 'italic' } },
    });
  });

  it('밑줄은 underline, 취소선은 line-through 글자 장식이고 기울임과 함께 담을 수 있다', () => {
    const { tokens } = buildDesignTokens(
      tokensInput({
        textStyles: [
          { ...bodyStyle, name: 'Body Underline', textDecoration: 'UNDERLINE' },
          {
            ...bodyStyle,
            name: 'Body Strikethrough Italic',
            fontStyle: 'Italic',
            boundVariables: {},
            textDecoration: 'STRIKETHROUGH',
          },
        ],
      }),
    );
    expect(at(tokens, ['style', 'text', 'Body Underline', '$extensions'])).toEqual({
      'com.seojaewan': { textDecoration: 'underline' },
    });
    expect(at(tokens, ['style', 'text', 'Body Strikethrough Italic', '$extensions'])).toEqual({
      'com.seojaewan': { fontStyle: 'italic', textDecoration: 'line-through' },
    });
  });

  it('기울임이 없고 글자 장식이 NONE이면 확장 필드를 두지 않는다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ textStyles: [bodyStyle] }));
    expect(at(tokens, ['style', 'text', 'Body', '$extensions'])).toBeUndefined();
  });

  it('계약에 없는 굵기의 기울임 스타일과 글자 장식은 모아 중단한다', () => {
    const input = tokensInput({
      textStyles: [
        { ...bodyStyle, name: 'Light', fontStyle: 'Light Italic', boundVariables: {} },
        { ...bodyStyle, name: 'Overline', textDecoration: 'OVERLINE' },
      ],
    });
    expect(() => buildDesignTokens(input)).toThrow(/Light Italic[\s\S]*OVERLINE/u);
  });

  it('효과 스타일은 그림자 배열이고 흐림은 com.seojaewan 확장 필드다. 원래 이름 조각을 경로로 쓴다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ effectStyles: [flyoutEffectStyle] }));
    expect(at(tokens, ['style', 'effect', 'Surface', 'Flyout (Acrylic)'])).toEqual({
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
    });
  });

  it('흐림만 있는 효과 스타일은 $value가 빈 배열이고, 안쪽 그림자는 inset이다', () => {
    const { tokens } = buildDesignTokens(
      tokensInput({
        effectStyles: [
          {
            name: 'Material/Blur',
            effects: [{ type: 'LAYER_BLUR', visible: true, radius: 4, boundVariables: {} }],
          },
          {
            name: 'Inner',
            effects: [
              {
                type: 'INNER_SHADOW',
                visible: true,
                color: { r: 0, g: 0, b: 0, a: 1 },
                offsetX: 0,
                offsetY: 1,
                radius: 0,
                spread: 0,
                boundVariables: { color: aliasTo('color/black/a-14') },
              },
            ],
          },
        ],
      }),
    );
    expect(at(tokens, ['style', 'effect', 'Material', 'Blur'])).toEqual({
      $type: 'shadow',
      $value: [],
      $extensions: { 'com.seojaewan': { layerBlur: { value: 4, unit: 'px' } } },
    });
    expect(at(tokens, ['style', 'effect', 'Inner', '$value'])).toEqual([
      expect.objectContaining({ color: '{color.black.a-14}', inset: true }),
    ]);
  });

  it('보이는 단색 하나(불투명, NORMAL)인 칠 스타일은 그 색이다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ paintStyles: [fallbackPaintStyle] }));
    expect(at(tokens, ['style', 'paint', 'Material', 'Fallback', 'Acrylic Default'])).toEqual({
      $type: 'color',
      $value: '{layer-fill.default}',
    });
  });

  it('여러 층인 칠 스타일은 첫 단색을 값으로 두고 모든 층을 layers 확장 필드에 담는다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ paintStyles: [acrylicPaintStyle] }));
    expect(at(tokens, ['style', 'paint', 'Material', 'Acrylic Default'])).toEqual({
      $type: 'color',
      $value: '{layer-fill.default}',
      $extensions: {
        'com.seojaewan': {
          layers: [
            {
              type: 'SOLID',
              color: '{layer-fill.default}',
              opacity: 0.85,
              blendMode: 'NORMAL',
            },
            {
              type: 'IMAGE',
              opacity: 0.02,
              blendMode: 'NORMAL',
              imageHash: 'a563f96d0f0af894df83be986ec4e7a84096fd54',
              asset: 'images/noise-acrylic',
              scaleMode: 'TILE',
              scalingFactor: 1,
            },
          ],
        },
      },
    });
  });

  it('칠 스타일 안의 NORMAL 단색 층 색이 날값이면 막는다(층이 여럿인 스타일 포함)', () => {
    const [luminosity, ...rest] = acrylicPaintStyle.paints;
    if (luminosity?.type !== 'SOLID') {
      throw new Error('fixture');
    }
    const raw: typeof acrylicPaintStyle = {
      name: 'Material/Raw',
      paints: [{ ...luminosity, blendMode: 'NORMAL', boundVariables: {} }, ...rest],
    };
    expect(() => buildDesignTokens(tokensInput({ paintStyles: [raw] }))).toThrow(
      'NORMAL 단색 층의 색 #f9f9f9이 변수에 연결되어 있지 않다',
    );
  });

  it('블렌드 모드가 NORMAL이 아닌 층이 있는 칠 스타일은 토큰에 넣지 않고 알린다', () => {
    const [solid, ...rest] = acrylicPaintStyle.paints;
    if (solid?.type !== 'SOLID') {
      throw new Error('fixture');
    }
    const mica: typeof acrylicPaintStyle = {
      name: 'Material/Mica Base',
      paints: [{ ...solid, blendMode: 'LUMINOSITY', boundVariables: {} }, ...rest],
    };
    const { tokens, skippedStyles, notices } = buildDesignTokens(
      tokensInput({ paintStyles: [mica] }),
    );
    expect(at(tokens, ['style', 'paint', 'Material', 'Mica Base'])).toBeUndefined();
    expect(skippedStyles).toEqual(['Material/Mica Base']);
    expect(notices).toEqual([
      expect.stringContaining('블렌드 모드 LUMINOSITY 층이 있어 토큰에 넣지 않는다'),
    ]);
  });

  it('그라디언트 색 지점이 날값이면 막는다', () => {
    const [gradient] = controlBorderPaintStyle.paints;
    if (gradient === undefined || !('gradientStops' in gradient)) {
      throw new Error('fixture');
    }
    const raw = {
      name: 'Raw Gradient',
      paints: [
        {
          ...gradient,
          gradientStops: gradient.gradientStops.map((stop) => ({ ...stop, boundVariables: {} })),
        },
      ],
    };
    expect(() => buildDesignTokens(tokensInput({ paintStyles: [raw] }))).toThrow(
      '그라디언트 색 지점이 변수에 연결되어 있지 않다',
    );
  });

  it('이름 있는 이미지 자산이 아닌 이미지 칠은 막는다', () => {
    expect(() =>
      buildDesignTokens(tokensInput({ paintStyles: [acrylicPaintStyle], imageAssets: {} })),
    ).toThrow('Foundations / Assets / Images의 자산이 아니다');
  });

  it('단색 없이 그라디언트가 있는 칠 스타일은 첫 그라디언트의 색 지점을 값으로 둔 gradient 토큰이다', () => {
    const { tokens } = buildDesignTokens(tokensInput({ paintStyles: [controlBorderPaintStyle] }));
    expect(at(tokens, ['style', 'paint', 'Elevation', 'Control Border'])).toEqual({
      $type: 'gradient',
      $value: [
        { color: '{color.black.a-14}', position: 0.9 },
        { color: '{color.black.a-14}', position: 1 },
      ],
      $extensions: {
        'com.seojaewan': {
          layers: [
            {
              type: 'GRADIENT_LINEAR',
              opacity: 1,
              blendMode: 'NORMAL',
              gradientStops: [
                { color: '{color.black.a-14}', position: 0.9 },
                { color: '{color.black.a-14}', position: 1 },
              ],
              gradientTransform: [
                [0, 1, 0],
                [-0.0417, 0, 0.5208],
              ],
            },
          ],
        },
      },
    });
  });

  it('단색이 있는 칠 스타일 안의 그라디언트 층도 같은 그라디언트 필드를 담는다', () => {
    const [gradient] = controlBorderPaintStyle.paints;
    const [solid] = fallbackPaintStyle.paints;
    if (gradient === undefined || solid === undefined) {
      throw new Error('fixture에 칠이 없다');
    }
    const { tokens } = buildDesignTokens(
      tokensInput({ paintStyles: [{ name: 'Mixed', paints: [gradient, solid] }] }),
    );
    expect(at(tokens, ['style', 'paint', 'Mixed', '$type'])).toBe('color');
    expect(at(tokens, ['style', 'paint', 'Mixed', '$value'])).toBe('{layer-fill.default}');
    expect(
      at(tokens, ['style', 'paint', 'Mixed', '$extensions', 'com.seojaewan', 'layers']),
    ).toEqual([
      expect.objectContaining({
        type: 'GRADIENT_LINEAR',
        gradientStops: [
          { color: '{color.black.a-14}', position: 0.9 },
          { color: '{color.black.a-14}', position: 1 },
        ],
      }),
      expect.objectContaining({ type: 'SOLID' }),
    ]);
  });

  it('이미지만 있는 칠 스타일은 토큰이 아니라 넣지 않고 건너뛴 목록으로 알린다', () => {
    const result = buildDesignTokens(tokensInput({ paintStyles: [wallpaperPaintStyle] }));
    expect(at(result.tokens, ['style'])).toBeUndefined();
    expect(result.skippedStyles).toEqual(['Wallpaper/Bloom']);
  });

  it('계약에 없는 칠이 보이면 중단한다', () => {
    const input = tokensInput({
      paintStyles: [
        {
          name: 'Video',
          paints: [
            ...fallbackPaintStyle.paints,
            { type: 'UNSUPPORTED', description: 'VIDEO', visible: true },
          ],
        },
      ],
    });
    expect(() => buildDesignTokens(input)).toThrow(/VIDEO/u);
  });

  it('숨긴 칠과 효과는 넣지 않는다', () => {
    const [solid] = fallbackPaintStyle.paints;
    if (solid === undefined) {
      throw new Error('fixture에 칠이 없다');
    }
    const { tokens } = buildDesignTokens(
      tokensInput({
        paintStyles: [
          {
            name: 'Hidden',
            paints: [
              solid,
              { type: 'UNSUPPORTED', description: 'GRADIENT_LINEAR', visible: false },
            ],
          },
        ],
      }),
    );
    expect(at(tokens, ['style', 'paint', 'Hidden', '$value'])).toBe('{layer-fill.default}');
  });
});
