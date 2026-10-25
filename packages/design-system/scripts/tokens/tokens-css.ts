/**
 * figma/tokens.json(DTCG 형식)을 src/tokens.css(Tailwind v4 `@theme`과 `@utility`)로 바꾼다.
 * 파일을 읽거나 쓰지 않는 순수 변환이라 Node가 아닌 곳(피그마 플러그인)에서도 가져다 쓸 수 있다.
 * 파일 입출력은 generate-tokens.ts가 맡는다.
 */

// 한글 전용 글자 스타일 묶음이다. 웹에서는 서체 목록으로 글자마다 서체가 나뉘므로 짝인 라틴 스타일에 합친다.
const HANGUL_STYLE_GROUP = 'Hangul';
// 재질(배경 흐림 + 반투명 바탕색)의 배경 흐림을 가진 효과 스타일 묶음이다.
const MATERIAL_STYLE_GROUP = 'Material';
// 앱 기본 서체(`--default-font-family`)와 고정폭 서체(`--default-mono-font-family`)를 정하는 글자 스타일이다.
const DEFAULT_TEXT_STYLE = 'Body';
const DEFAULT_MONO_TEXT_STYLE = 'Code';
// 소수 오차(0.9599999785)를 지우는 자릿수다.
const NUMBER_PRECISION = 4;
// 투명도와 RGB가 모두 다른 두 정지점 사이에 넣는 중간 정지점 수다.
const INTERPOLATION_STOPS = 4;
// 직선 이징(피그마 LINEAR)의 베지어 제어점이다. CSS에는 `linear`로 쓴다.
const LINEAR_BEZIER = '0,0,1,1';
// 플러그인이 붙이는 확장 필드 이름이다.
const FIGMA_EXTENSION = 'com.figma';
const SEOJAEWAN_EXTENSION = 'com.seojaewan';
// Primitive 변수 모음이다. 컴포넌트는 Semantic·Component 변수를 쓰므로 클래스를 만들지 않는다.
const PRIMITIVE_COLLECTION = 'Primitive';
// 배경 흐림이 있는 효과 스타일은 그림자와 배경 흐림을 이 접미사의 변수 둘로 나눈다.
const SHADOW_SUFFIX = 'shadow';
const BACKDROP_BLUR_SUFFIX = 'backdrop-blur';
// 그림자만 있는 효과 스타일의 text-shadow 값 변수 앞에 붙이는 이름이다(`--shadow-text-elevation-flyout`).
// `--text-*`는 Tailwind 글자 크기 이름공간이고 ESLint가 그 이름 그대로인 클래스를 막으며,
// `--<묶음>-*`는 box-shadow 변수와 같은 이름공간이라 `shadow-<묶음>-*`가 읽어 버린다. 그래서 둘 다 피한다.
const TEXT_SHADOW_PREFIX = 'shadow-text';
// 그룹 자신의 토큰을 담는 DTCG 예약 이름이다. CSS 이름에는 들어가지 않는다.
const ROOT_TOKEN = '$root';

// Tailwind 기본 테마 중 토큰이 채우는 이름공간이다. 지운 뒤에 토큰을 정의해야 토큰이 남는다.
const CLEARED_NAMESPACES = [
  '--color-*',
  '--spacing',
  '--spacing-*',
  '--font-*',
  '--text-*',
  '--leading-*',
  '--radius-*',
  '--shadow-*',
  '--blur-*',
  '--ease-*',
  '--animate-*',
] as const;

// 피그마 경로 이름공간이 Tailwind 기본 이름공간과 같아 Tailwind 기본 유틸리티가 그대로 읽는 것이다.
const BUILT_IN_NAMESPACES = [
  ['p-*, m-*, gap-*, inset-* 등 간격', '--spacing-*'],
  ['rounded-*', '--radius-*'],
  ['opacity-*', '--opacity-*'],
  ['blur-*, backdrop-blur-*', '--blur-*'],
  ['font-*(굵기)', '--font-weight-*'],
] as const;

// 안쪽 선(피그마 INSIDE 선)을 레이아웃에 넣지 않고 자식 위에 그리는 ::before 고리다.
// 두께는 inner-border-w-*가 정하고, 두께 클래스가 없으면 고리가 보이지 않는다.
// ::before가 요소에 맞춰지도록 요소에 relative 같은 위치 지정과 쌓임 맥락(isolate)이 있어야 한다.
const RING_DECLARATIONS = [
  "content: '';",
  'position: absolute;',
  'z-index: 1;',
  'inset: 0;',
  'padding: var(--inner-border-width);',
  'border-radius: inherit;',
] as const;
const RING_MASK = [
  'mask:',
  '  linear-gradient(#000 0 0) content-box exclude,',
  '  linear-gradient(#000 0 0);',
  'pointer-events: none;',
] as const;

/** 이름공간 하나에 붙이는 유틸리티 하나 */
type NamespaceUtility = {
  /** `@utility` 이름에서 `-*` 앞부분 */
  prefix: string;
  /** `--value()`를 받아 선언 목록을 만든다 */
  declarations: (value: string) => string[];
  /** 머리 주석 표에 쓰는 CSS 설명 */
  css: string;
  /** 머리 주석 표에 쓰는 클래스 모양. 없으면 `<prefix>-*` */
  label?: string;
};

/** 펼친 토큰 하나 */
type FlatToken = {
  /** 피그마 경로 조각. 그룹의 `$root` 토큰이면 `$root`를 뺀 그룹 경로다. */
  path: string[];
  /** 그룹의 `$root` 토큰인지. 별칭은 `{a.b.$root}`로 가리킨다. */
  isRoot: boolean;
  type: string;
  value: unknown;
  extensions: Record<string, unknown>;
};

/** `@theme` 변수 하나 */
type CssVariable = {
  name: string;
  value: string;
  /** 오류 메시지에 쓸 출처 */
  source: string;
  /** 유틸리티가 읽지 않아 이름공간과 상관없이 :root에 두는지 */
  isRootOnly?: boolean;
};

/** 변환에 쓰는 표 */
type Context = {
  /** 변수 경로(`a/b/c`) → 토큰 */
  variables: ReadonlyMap<string, FlatToken>;
};

type Rgba = [number, number, number, number];

/** 그라데이션 정지점 하나 */
type ParsedStop = {
  /** CSS 색(별칭이면 var()) */
  css: string;
  /** CSS 정지점 위치(%) */
  percent: number;
  /** 실제 색(0~255). 알 수 없으면 undefined */
  rgba: Rgba | undefined;
};

/** 토큰 JSON이 계약과 맞지 않을 때 경로와 함께 알린다. */
export class TokenFormatError extends Error {
  /**
   * 오류 메시지에 토큰 경로를 붙인다.
   * @param path 문제가 된 토큰 경로(`/`로 이은 이름)
   * @param message 무엇이 맞지 않는지
   */
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'TokenFormatError';
  }
}

/**
 * tokens.json을 tokens.css 내용으로 바꾼다. 같은 입력이면 언제나 같은 글자를 돌려준다.
 * CSS 이름은 `--` + 피그마 경로를 `-`로 이은 것이고(스타일도 스타일 이름 경로로 같다), 별칭은 `var()`로 남긴다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param json figma/tokens.json을 파싱한 값
 * @returns Tailwind 기본값 지우기, `@theme static`, `@utility`를 담은 CSS
 */
export function tokensJsonToCss(json: unknown): string {
  if (!isRecord(json)) {
    throw new TokenFormatError('(root)', '최상위는 객체여야 한다.');
  }
  const { style, ...groups } = json;
  const variableTokens = flattenTokens(groups, [], undefined);
  const context: Context = {
    variables: new Map(variableTokens.map((token) => [variableKey(token), token])),
  };
  const styles = isRecord(style) ? style : {};
  const paints = flattenTokens(asGroup(styles.paint, 'style/paint'), [], undefined);
  const effects = flattenTokens(asGroup(styles.effect, 'style/effect'), [], undefined);
  const texts = flattenTokens(asGroup(styles.text, 'style/text'), [], undefined);

  const variables = [
    ...variableTokens.map((token) => variableCss(token, context)),
    ...effects.flatMap((token) => effectVariables(token, context)),
    ...paints.map((token) => paintVariable(token, context)),
  ];
  assertUniqueNames(variables);

  const colorGroups = uniqueSorted([
    ...variableTokens
      .filter((token) => token.type === 'color' && collectionOf(token) !== PRIMITIVE_COLLECTION)
      .map(groupOf),
    ...paints.filter((token) => token.type === 'color').map(groupOf),
  ]);
  const namespaces = namespaceUtilities(
    new Set(variables.map((variable) => variable.name)),
    colorGroups,
    uniqueSorted(paints.filter((token) => token.type === 'gradient').map(groupOf)),
    uniqueSorted(
      effects
        .filter((token) => !hasBackgroundBlur(token) && shadowLayers(token).length > 0)
        .map(groupOf),
    ),
    uniqueSorted(
      effects
        .filter(
          (token) => !hasBackgroundBlur(token) && textShadowValue(token, context) !== undefined,
        )
        .map(groupOf),
    ),
  );
  // 유틸리티가 읽는 이름공간의 변수만 @theme에 둔다. 나머지는 :root에 두어 Tailwind 기본 유틸리티가
  // 이름이 겹치는 변수로 뜻하지 않은 클래스(예: --font-size-body → font-size-body)를 만들지 않게 한다.
  const themePrefixes = [
    ...namespaces.map(([namespace]) => `${namespace}-`),
    ...BUILT_IN_NAMESPACES.map(([, namespace]) => namespace.slice(0, -1)),
  ];
  /**
   * 변수를 `@theme`에 둘지 정한다.
   * @param variable CSS 변수
   * @returns 유틸리티가 읽는 이름공간이면 true
   */
  function isThemeVariable(variable: CssVariable): boolean {
    return (
      variable.isRootOnly !== true &&
      themePrefixes.some((prefix) => variable.name.startsWith(prefix))
    );
  }

  const blocks = [
    header(namespaces, colorGroups),
    clearingBlock(texts, context),
    block(':root', declarationLines(variables.filter((variable) => !isThemeVariable(variable)))),
    block('@theme static', declarationLines(variables.filter(isThemeVariable))),
    ...namespaces.map(([namespace, utility]) =>
      block(`@utility ${utility.prefix}-*`, utility.declarations(`--value(${namespace}-*)`)),
    ),
    ...textUtilities(texts, context),
    ...effects.flatMap((token) => blurredEffectUtility(token)),
    ...materialUtilities(paints, effects),
  ];
  return `${blocks.join('\n\n')}\n`;
}

/**
 * 피그마 경로를 CSS 사용자 속성 이름으로 바꾼다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param path 경로 조각(`['text-fill', 'primary']`, `['Surface', 'Flyout (Acrylic)']`)
 * @returns `--text-fill-primary`, `--surface-flyout-acrylic`
 */
export function cssName(path: readonly string[]): string {
  return `--${kebabPath(path)}`;
}

/**
 * 경로 조각을 소문자 kebab-case로 이어 붙인다. 공백은 `-`가 되고 괄호는 빠진다.
 * @param path 경로 조각
 * @returns `surface-flyout-acrylic`
 */
function kebabPath(path: readonly string[]): string {
  return path.map(kebabSegment).join('-');
}

/**
 * 경로 조각 하나를 소문자 kebab-case로 바꾼다.
 * @param segment `Flyout (Acrylic)`
 * @returns `flyout-acrylic`
 */
function kebabSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[()]/gu, '')
    .trim()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
}

/**
 * 토큰이 속한 첫 경로 조각(묶음)을 CSS 이름 조각으로 구한다.
 * @param token 토큰
 * @returns `accent-fill`, `elevation`
 */
function groupOf(token: FlatToken): string {
  return kebabPath(token.path.slice(0, 1));
}

/**
 * 이름공간마다 만들 유틸리티를 정한다. 토큰이 하나도 없는 이름공간은 만들지 않는다.
 * @param names 변수 CSS 이름 전체
 * @param colorGroups 색 변수·단색 칠 스타일 묶음
 * @param gradientGroups 그라데이션 칠 스타일 묶음
 * @param shadowGroups 그림자가 있는 효과 스타일 묶음
 * @param textShadowGroups text-shadow로도 쓸 수 있는 효과 스타일 묶음
 * @returns `[이름공간, 유틸리티]` 목록(정렬)
 */
function namespaceUtilities(
  names: ReadonlySet<string>,
  colorGroups: readonly string[],
  gradientGroups: readonly string[],
  shadowGroups: readonly string[],
  textShadowGroups: readonly string[],
): [string, NamespaceUtility][] {
  const result: [string, NamespaceUtility][] = [];
  /**
   * 이름공간에 변수가 하나라도 있는지 확인한다.
   * @param namespace `--size`
   * @returns 있으면 true
   */
  function hasNamespace(namespace: string): boolean {
    return [...names].some((name) => name.startsWith(`${namespace}-`));
  }
  /**
   * 이름공간에 유틸리티를 더한다.
   * @param namespace `--size`
   * @param utilities 유틸리티
   */
  function add(namespace: string, utilities: readonly NamespaceUtility[]): void {
    for (const utility of utilities) {
      result.push([namespace, utility]);
    }
  }

  for (const group of colorGroups) {
    add(`--${group}`, colorUtilities(group));
  }
  for (const group of gradientGroups) {
    add(`--${group}`, [
      {
        prefix: `bg-gradient-${group}`,
        css: 'background-image',
        declarations: (value) => [`background-image: ${value};`],
      },
      {
        prefix: `border-gradient-${group}`,
        css: '안쪽 선 고리(그라데이션)',
        declarations: (value) => ringBlock(value),
      },
    ]);
  }
  for (const group of shadowGroups) {
    add(`--${group}`, [
      {
        prefix: `shadow-${group}`,
        css: 'box-shadow',
        declarations: (value) => [`box-shadow: ${value};`],
      },
    ]);
  }
  for (const group of textShadowGroups) {
    add(`--${TEXT_SHADOW_PREFIX}-${group}`, [
      {
        prefix: `text-shadow-${group}`,
        css: 'text-shadow',
        declarations: (value) => [`text-shadow: ${value};`],
      },
    ]);
  }
  if (hasNamespace('--size')) {
    add('--size', sizeUtilities);
  }
  if (hasNamespace('--stroke-width')) {
    add('--stroke-width', strokeWidthUtilities);
  }
  // motion/* 변수로는 유틸리티를 만들지 않는다. motion.css의 motion-* 클래스가 var()로 쓴다(:root에 남는다).
  return result.sort(([, a], [, b]) => naturalCompare(a.prefix, b.prefix));
}

/**
 * 색 묶음 하나의 색 유틸리티를 만든다.
 * @param group 색 묶음(`text-fill`)
 * @returns 배경, 글자, 선, 바깥 선, 안쪽 선 유틸리티
 */
function colorUtilities(group: string): NamespaceUtility[] {
  const utilities: NamespaceUtility[] = [
    {
      prefix: `bg-${group}`,
      css: 'background-color',
      declarations: (value) => [`background-color: ${value};`],
    },
    { prefix: `text-${group}`, css: 'color', declarations: (value) => [`color: ${value};`] },
    {
      prefix: `border-${group}`,
      css: 'border-color',
      declarations: (value) => [`border-color: ${value};`],
    },
    {
      prefix: `outline-${group}`,
      css: 'outline-color',
      declarations: (value) => [`outline-color: ${value};`],
    },
    {
      prefix: `inner-border-${group}`,
      css: '안쪽 선 고리(색)',
      declarations: (value) => ringBlock(value),
    },
  ];
  return utilities.map((utility) => ({
    ...utility,
    label: `${utility.prefix.slice(0, -group.length)}<색 묶음>-*`,
  }));
}

/**
 * 안쪽 선 고리 선언을 만든다.
 * @param background 고리의 칠(색이나 그라데이션)
 * @returns `&::before { ... }` 줄 목록
 */
function ringBlock(background: string): string[] {
  return [
    '&::before {',
    ...[...RING_DECLARATIONS, `background: ${background};`, ...RING_MASK].map(
      (line) => `  ${line}`,
    ),
    '}',
  ];
}

const sizeUtilities: readonly NamespaceUtility[] = [
  propertyUtility('w', ['width']),
  propertyUtility('h', ['height']),
  propertyUtility('size', ['width', 'height']),
  propertyUtility('min-w', ['min-width']),
  propertyUtility('min-h', ['min-height']),
  propertyUtility('max-w', ['max-width']),
  propertyUtility('max-h', ['max-height']),
];

const strokeWidthUtilities: readonly NamespaceUtility[] = [
  ...(
    [
      ['border', ['border-width']],
      ['border-x', ['border-inline-width']],
      ['border-y', ['border-block-width']],
      ['border-t', ['border-top-width']],
      ['border-r', ['border-right-width']],
      ['border-b', ['border-bottom-width']],
      ['border-l', ['border-left-width']],
    ] as const
  ).map(([prefix, properties]) => borderWidthUtility(prefix, properties)),
  {
    prefix: 'outline',
    css: 'outline-width',
    declarations: (value) => [
      'outline-style: var(--tw-outline-style, solid);',
      `outline-width: ${value};`,
    ],
  },
  {
    prefix: 'inner-border-w',
    css: '안쪽 선 고리 두께',
    declarations: (value) => [`--inner-border-width: ${value};`],
  },
  propertyUtility('w-stroke', ['width']),
  propertyUtility('h-stroke', ['height']),
];

/**
 * 선 두께 유틸리티를 만든다. Tailwind 기본 border-* 처럼 선 모양을 함께 정한다(border-dashed 등이 덮어쓴다).
 * @param prefix 클래스 앞부분
 * @param properties 두께 CSS 속성
 * @returns 유틸리티
 */
function borderWidthUtility(prefix: string, properties: readonly string[]): NamespaceUtility {
  return {
    prefix,
    css: properties.join(', '),
    declarations: (value) => [
      'border-style: var(--tw-border-style, solid);',
      ...properties.map((property) => `${property}: ${value};`),
    ],
  };
}

/**
 * 속성 몇 개에 같은 값을 주는 유틸리티를 만든다.
 * @param prefix 클래스 앞부분
 * @param properties CSS 속성
 * @returns 유틸리티
 */
function propertyUtility(prefix: string, properties: readonly string[]): NamespaceUtility {
  return {
    prefix,
    css: properties.join(', '),
    declarations: (value) => properties.map((property) => `${property}: ${value};`),
  };
}

/**
 * 생성 파일 머리 주석(클래스 이름 표)을 만든다.
 * @param namespaces 이름공간 유틸리티
 * @param colorGroups 색 묶음
 * @returns 주석
 */
function header(
  namespaces: readonly [string, NamespaceUtility][],
  colorGroups: readonly string[],
): string {
  const rows = new Map<string, string>();
  for (const [namespace, utility] of namespaces) {
    const label = utility.label ?? `${utility.prefix}-*`;
    const variable = utility.label === undefined ? `${namespace}-*` : '--<색 묶음>-*';
    rows.set(label, `| \`${label}\` | ${utility.css} | \`${variable}\` |`);
  }
  const lines = [
    '이 파일은 scripts/tokens/generate-tokens.ts가 figma/tokens.json에서 만든다. 손으로 고치지 않는다.',
    '다시 만들기: pnpm --filter @seojaewan/design-system generate:tokens',
    '',
    'CSS 이름은 `--` + 피그마 경로를 `-`로 이은 것이다(스타일은 스타일 이름 경로).',
    '유틸리티가 읽는 변수는 @theme static에, 나머지(Primitive 색, 글자 스타일이 쓰는 서체 값, motion.css가 쓰는 모션 값 등)는 :root에 둔다.',
    '',
    '| 클래스 | CSS | 변수 |',
    '|---|---|---|',
    ...[...rows.values()],
    ...BUILT_IN_NAMESPACES.map(
      ([classes, namespace]) => `| ${classes} | Tailwind 기본 유틸리티 | \`${namespace}\` |`,
    ),
    '| `type-<글자 스타일>` | 서체, 크기, 굵기, 줄 높이, 자간 | 글자 스타일 |',
    '| `<효과 스타일>`(배경 흐림이 있는 것) | box-shadow, backdrop-filter | `--<효과 스타일>-shadow`, `-backdrop-blur` |',
    '| `material-<재질>` | background-color, backdrop-filter | `Material/*` 칠·효과 스타일 |',
    '',
    `색 묶음: ${colorGroups.join(', ')}`,
  ];
  return `/*\n${lines.map((line) => (line === '' ? ' *' : ` * ${line}`)).join('\n')}\n */`;
}

/**
 * Tailwind 기본 테마 지우기와 기본 서체 블록을 만든다. 토큰보다 앞에 와야 한다.
 * @codocs [[기술 스택:스타일링]]
 * @param texts 글자 스타일
 * @param context 변환 표
 * @returns `@theme` 블록
 */
function clearingBlock(texts: readonly FlatToken[], context: Context): string {
  const lines: string[] = CLEARED_NAMESPACES.map((namespace) => `${namespace}: initial;`);
  const defaults: [string, string][] = [
    ['--default-font-family', DEFAULT_TEXT_STYLE],
    ['--default-mono-font-family', DEFAULT_MONO_TEXT_STYLE],
  ];
  const familyLines = defaults.flatMap(([name, style]) => {
    const token = texts.find((text) => text.path.join('/') === style);
    return token === undefined ? [] : [`${name}: ${textFamily(token, texts, context)};`];
  });
  if (familyLines.length > 0) {
    lines.push(
      '',
      '/* 기본 서체는 글자 스타일 Body·Code의 서체(라틴 + 한글)를 따른다. */',
      ...familyLines,
    );
  }
  return block('@theme', lines);
}

/**
 * 변수를 이름 순으로 선언 줄로 쓴다.
 * @param list 변수
 * @returns 선언 줄
 */
function declarationLines(list: readonly CssVariable[]): string[] {
  return [...list]
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((variable) => `${variable.name}: ${variable.value};`);
}

/**
 * 블록 글자를 만든다.
 * @param selector 블록 머리
 * @param lines 안쪽 줄(빈 줄은 그대로 둔다)
 * @returns `selector {\n  ...\n}`
 */
function block(selector: string, lines: readonly string[]): string {
  return `${selector} {\n${lines.map((line) => (line === '' ? '' : `  ${line}`)).join('\n')}\n}`;
}

/**
 * 변수 토큰 하나를 CSS 변수로 바꾼다.
 * @param token 변수 토큰
 * @param context 변환 표
 * @returns CSS 변수
 */
function variableCss(token: FlatToken, context: Context): CssVariable {
  const source = token.path.join('/');
  const reference = aliasReference(token.value, context, source);
  return {
    name: cssName(token.path),
    value: reference ?? rawValue(token, source),
    source,
  };
}

/**
 * 별칭이 아닌 변수 값을 CSS 값으로 바꾼다.
 * @param token 변수 토큰
 * @param source 오류 메시지에 쓸 경로
 * @returns CSS 값
 */
function rawValue(token: FlatToken, source: string): string {
  switch (token.type) {
    case 'color':
      return colorValue(token.value, source);
    case 'dimension':
      return unitValue(token.value, source);
    case 'duration':
      return unitValue(token.value, source);
    case 'fontFamily':
      return quoteFamily(stringValue(token.value, source));
    case 'fontWeight':
      return formatNumber(numberValue(token.value, source));
    case 'cubicBezier':
      return easingValue(token.value, source);
    case 'number': {
      const value = numberValue(token.value, source);
      // 피그마 불투명도 변수(0~100)는 백분율이다.
      return scopesOf(token).includes('OPACITY') ? `${formatNumber(value)}%` : formatNumber(value);
    }
    default:
      throw new TokenFormatError(source, `$type ${token.type}은 변환 규칙이 없다.`);
  }
}

/**
 * 효과 스타일을 CSS 변수로 바꾼다. 그림자만 있으면 `--<이름>`(box-shadow)이고,
 * 배경 흐림이 있으면 `--<이름>-shadow`(그림자가 있을 때)와 `--<이름>-backdrop-blur`다.
 * @param token 효과 스타일
 * @param context 변환 표
 * @returns CSS 변수
 */
function effectVariables(token: FlatToken, context: Context): CssVariable[] {
  const source = effectSource(token);
  const layers = shadowLayers(token);
  const shadow = layers.map((layer) => shadowValue(layer, context, source)).join(', ');
  const blur = backgroundBlur(token, context, source);
  if (blur === undefined) {
    if (layers.length === 0) {
      return [];
    }
    const textShadow = textShadowValue(token, context);
    return [
      { name: cssName(token.path), value: shadow, source },
      ...(textShadow === undefined
        ? []
        : [{ name: cssName([TEXT_SHADOW_PREFIX, ...token.path]), value: textShadow, source }]),
    ];
  }
  return [
    ...(layers.length === 0
      ? []
      : [{ name: cssName([...token.path, SHADOW_SUFFIX]), value: shadow, source }]),
    {
      name: cssName([...token.path, BACKDROP_BLUR_SUFFIX]),
      value: blur,
      source,
      isRootOnly: true,
    },
  ];
}

/**
 * 효과 스타일 오류 메시지에 쓸 경로를 만든다.
 * @param token 효과 스타일
 * @returns `style/effect/Elevation/Flyout`
 */
function effectSource(token: FlatToken): string {
  return `style/effect/${token.path.join('/')}`;
}

/**
 * 그림자만 있는 효과 스타일을 `text-shadow` 값(`<x> <y> <blur> <color>`)으로 바꾼다.
 * text-shadow에는 퍼짐과 안쪽 그림자가 없어서, 퍼짐이 0이 아니거나 안쪽 그림자인 층이 있으면 만들지 않는다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param token 효과 스타일
 * @param context 변환 표
 * @returns `0px 1px 2px #00000099`, 만들 수 없으면 undefined
 */
function textShadowValue(token: FlatToken, context: Context): string | undefined {
  const source = effectSource(token);
  const layers = shadowLayers(token);
  if (layers.length === 0 || !layers.every((layer) => isTextShadowLayer(layer, context, source))) {
    return undefined;
  }
  return layers
    .map((layer) => {
      const [x, y, blur, , color] = shadowParts(layer, context, source);
      return [x, y, blur, color].join(' ');
    })
    .join(', ');
}

/**
 * 그림자 층을 text-shadow로 옮길 수 있는지 확인한다. 퍼짐이 0이고 안쪽 그림자가 아니어야 한다.
 * @param layer 그림자 층
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns 옮길 수 있으면 true
 */
function isTextShadowLayer(layer: unknown, context: Context, source: string): boolean {
  if (!isRecord(layer) || layer.inset === true) {
    return false;
  }
  aliasReference(layer.spread, context, source);
  const target = aliasPath(layer.spread);
  const spread = target === undefined ? layer.spread : context.variables.get(target)?.value;
  return isRecord(spread) && spread.value === 0;
}

/**
 * 배경 흐림이 있는 효과 스타일을 스타일 이름의 `@utility`로 바꾼다(그림자와 배경 흐림).
 * @param token 효과 스타일
 * @returns `@utility` 블록(배경 흐림이 없으면 없음)
 */
function blurredEffectUtility(token: FlatToken): string[] {
  if (!hasBackgroundBlur(token)) {
    return [];
  }
  return [
    block(`@utility ${kebabPath(token.path)}`, [
      ...(shadowLayers(token).length === 0
        ? []
        : [`box-shadow: var(${cssName([...token.path, SHADOW_SUFFIX])});`]),
      ...backdropBlur(`var(${cssName([...token.path, BACKDROP_BLUR_SUFFIX])})`),
    ]),
  ];
}

/**
 * 효과 스타일에 배경 흐림이 있는지 확인한다.
 * @param token 효과 스타일
 * @returns 있으면 true
 */
function hasBackgroundBlur(token: FlatToken): boolean {
  const extension = token.extensions[SEOJAEWAN_EXTENSION];
  return isRecord(extension) && extension.backgroundBlur !== undefined;
}

/**
 * 효과 스타일의 그림자 층을 구한다.
 * @param token 효과 스타일
 * @returns 그림자 층
 */
function shadowLayers(token: FlatToken): unknown[] {
  if (token.type !== 'shadow') {
    throw new TokenFormatError(
      effectSource(token),
      `효과 스타일의 $type은 shadow여야 한다(${token.type}).`,
    );
  }
  return Array.isArray(token.value) ? token.value : [token.value];
}

/**
 * 효과 스타일의 배경 흐림 값을 구한다.
 * @param token 효과 스타일
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns CSS 길이, 없으면 undefined
 */
function backgroundBlur(token: FlatToken, context: Context, source: string): string | undefined {
  const extension = token.extensions[SEOJAEWAN_EXTENSION];
  const blur = isRecord(extension) ? extension.backgroundBlur : undefined;
  if (blur === undefined) {
    return undefined;
  }
  return aliasReference(blur, context, source) ?? unitValue(blur, source);
}

/**
 * 배경 흐림 선언을 만든다.
 * @param blur CSS 길이
 * @returns 선언 줄
 */
function backdropBlur(blur: string): string[] {
  return [`-webkit-backdrop-filter: blur(${blur});`, `backdrop-filter: blur(${blur});`];
}

/**
 * 칠 스타일을 CSS 변수로 바꾼다. 단색은 색, 그라데이션은 위→아래 `linear-gradient()`다.
 * @param token 칠 스타일
 * @param context 변환 표
 * @returns CSS 변수
 */
function paintVariable(token: FlatToken, context: Context): CssVariable {
  const source = `style/paint/${token.path.join('/')}`;
  const name = cssName(token.path);
  switch (token.type) {
    case 'color':
      return { name, value: solidPaintColor(token, context, source), source };
    case 'gradient':
      return { name, value: linearGradient(token.value, context, source), source };
    default:
      throw new TokenFormatError(source, `칠 스타일 $type ${token.type}은 변환 규칙이 없다.`);
  }
}

/**
 * 단색 칠 스타일의 색을 만든다. 이미지 층(예전 재질의 노이즈)은 그리지 않는다.
 * 피그마에서 변수에 연결한 단색 칠은 변수 색의 알파를 쓰지 않고 칠 불투명도만 쓰므로,
 * 불투명도가 1보다 작으면 변수 색의 RGB에 칠 불투명도를 알파로 준다.
 * @codocs [[디자인 기반:재질 효과]]
 * @param token 칠 스타일
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns CSS 색
 */
function solidPaintColor(token: FlatToken, context: Context, source: string): string {
  const extension = token.extensions[SEOJAEWAN_EXTENSION];
  const layers: unknown[] =
    isRecord(extension) && Array.isArray(extension.layers) ? extension.layers : [];
  const solids = layers.filter((layer) => isRecord(layer) && layer.type !== 'IMAGE');
  if (solids.length > 1) {
    throw new TokenFormatError(source, '단색 칠 스타일에 칠 층이 여럿이다.');
  }
  const [layer] = solids;
  const opacity =
    isRecord(layer) && layer.opacity !== undefined ? numberValue(layer.opacity, source) : 1;
  const reference = aliasReference(token.value, context, source);
  if (reference !== undefined) {
    return opacity >= 1 ? reference : `rgb(from ${reference} r g b / ${formatNumber(opacity)})`;
  }
  const rgba = parseHex(colorValue(token.value, source));
  if (rgba === undefined) {
    throw new TokenFormatError(source, '색 값을 읽을 수 없다.');
  }
  return opacity >= 1
    ? colorValue(token.value, source)
    : hexOf([...rgba.slice(0, 3), opacity * 255]);
}

/**
 * 재질 칠 스타일(`Material/*` 효과 스타일 이름으로 시작하는 칠 스타일)을 `@utility`로 바꾼다.
 * 재질은 반투명 바탕색(칠 스타일)과 배경 흐림(효과 스타일)이다.
 * @codocs [[디자인 기반:재질 효과]]
 * @param paints 칠 스타일
 * @param effects 효과 스타일
 * @returns `@utility material-*` 블록
 */
function materialUtilities(paints: readonly FlatToken[], effects: readonly FlatToken[]): string[] {
  const materials = effects.filter((effect) => effect.path[0] === MATERIAL_STYLE_GROUP);
  const utilities: string[] = [];
  for (const paint of paints) {
    if (paint.type !== 'color' || paint.path[0] !== MATERIAL_STYLE_GROUP) {
      continue;
    }
    const name = paint.path.join('/');
    // 칠 스타일 이름이 효과 스타일 이름 + 공백이나 `/`로 시작하는 것 중 가장 긴 것이 짝이다.
    const effect = materials
      .filter((candidate) => {
        const prefix = candidate.path.join('/');
        return name.startsWith(`${prefix} `) || name.startsWith(`${prefix}/`);
      })
      .sort((a, b) => b.path.join('/').length - a.path.join('/').length)[0];
    if (effect === undefined || !hasBackgroundBlur(effect)) {
      continue;
    }
    utilities.push(
      block(`@utility ${kebabPath(paint.path)}`, [
        `background-color: var(${cssName(paint.path)});`,
        ...backdropBlur(`var(${cssName([...effect.path, BACKDROP_BLUR_SUFFIX])})`),
      ]),
    );
  }
  return utilities.sort(naturalCompare);
}

/**
 * 글자 스타일을 `@utility type-*`로 바꾼다. `Hangul/*` 스타일은 짝인 라틴 스타일의 서체 목록 뒤에 붙인다.
 * @codocs [[디자인 기반:서체]]
 * @param texts 글자 스타일
 * @param context 변환 표
 * @returns `@utility` 블록
 */
function textUtilities(texts: readonly FlatToken[], context: Context): string[] {
  return texts
    .filter((token) => token.path[0] !== HANGUL_STYLE_GROUP)
    .map((token) => textUtility(token, texts, context))
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((utility) => block(`@utility ${utility.name}`, utility.lines));
}

/**
 * 라틴 글자 스타일 하나를 유틸리티 이름과 선언으로 바꾼다.
 * @param token 글자 스타일
 * @param texts 글자 스타일 전체(짝인 Hangul 스타일을 찾는다)
 * @param context 변환 표
 * @returns 이름과 선언
 */
function textUtility(
  token: FlatToken,
  texts: readonly FlatToken[],
  context: Context,
): { name: string; lines: string[] } {
  const source = `style/text/${token.path.join('/')}`;
  const value = asGroup(token.value, source);
  /**
   * 글자 스타일 값 하나를 CSS 값으로 바꾼다.
   * @param key 값 이름
   * @param convert 별칭이 아닐 때 바꾸는 함수
   * @returns CSS 값
   */
  function field(key: string, convert: (raw: unknown) => string): string {
    const raw = value[key];
    if (raw === undefined) {
      throw new TokenFormatError(source, `${key}가 없다.`);
    }
    return aliasReference(raw, context, source) ?? convert(raw);
  }
  return {
    name: `type-${kebabPath(token.path)}`,
    lines: [
      `font-family: ${textFamily(token, texts, context)};`,
      `font-size: ${field('fontSize', (raw) => unitValue(raw, source))};`,
      `font-weight: ${field('fontWeight', (raw) => formatNumber(numberValue(raw, source)))};`,
      `line-height: ${field('lineHeight', (raw) => lineHeightValue(raw, source))};`,
      `letter-spacing: ${field('letterSpacing', (raw) => letterSpacingValue(raw, source))};`,
    ],
  };
}

/**
 * 글자 스타일의 서체 목록을 만든다. 짝인 `Hangul/*` 스타일이 있으면 그 서체를 뒤에 붙인다.
 * @param token 라틴 글자 스타일
 * @param texts 글자 스타일 전체
 * @param context 변환 표
 * @returns `var(--font-family-base), var(--font-family-korean)`
 */
function textFamily(token: FlatToken, texts: readonly FlatToken[], context: Context): string {
  const name = token.path.join('/');
  const hangul = texts.find((text) => text.path.join('/') === `${HANGUL_STYLE_GROUP}/${name}`);
  const families = [token, ...(hangul === undefined ? [] : [hangul])].map(
    /**
     * 글자 스타일 하나의 서체를 CSS 값으로 바꾼다.
     * @param text 글자 스타일
     * @returns `var(--font-family-base)`
     */
    (text) => {
      const source = `style/text/${text.path.join('/')}`;
      const family = asGroup(text.value, source).fontFamily;
      return aliasReference(family, context, source) ?? quoteFamily(stringValue(family, source));
    },
  );
  return uniqueSorted(families).length === 1 ? (families[0] ?? '') : families.join(', ');
}

/**
 * 정지점 목록을 위→아래 `linear-gradient()`로 바꾼다.
 * 피그마는 정지점 사이 색을 투명도와 따로(투명도를 곱하지 않고) 섞고, CSS는 투명도를 곱한 값으로 섞는다.
 * 투명도와 RGB가 모두 다른 두 정지점 사이에는 피그마 방식으로 계산한 중간 정지점을 넣는다.
 * @codocs [[디자인 기반:컨트롤 테두리]]
 * @param stops `[{color, position}]`
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns `linear-gradient(to bottom, ...)`
 */
function linearGradient(stops: unknown, context: Context, source: string): string {
  if (!Array.isArray(stops) || stops.length === 0) {
    throw new TokenFormatError(source, '그라데이션 정지점은 비어 있지 않은 배열이어야 한다.');
  }
  const parsed = stops.map(
    /**
     * 정지점 하나를 읽는다.
     * @param stop `{color, position}`
     * @returns CSS 색, 위치, 실제 색
     */
    (stop: unknown): ParsedStop => {
      if (!isRecord(stop)) {
        throw new TokenFormatError(source, '그라데이션 정지점은 {color, position}이어야 한다.');
      }
      return {
        css: aliasReference(stop.color, context, source) ?? colorValue(stop.color, source),
        percent: round(numberValue(stop.position, source) * 100),
        rgba: resolvedRgba(stop.color, context),
      };
    },
  );
  const parts: string[] = [];
  for (const [index, stop] of parsed.entries()) {
    parts.push(`${stop.css} ${formatNumber(stop.percent)}%`);
    const next = parsed[index + 1];
    if (next !== undefined) {
      parts.push(...interpolatedStops(stop, next));
    }
  }
  return `linear-gradient(to bottom, ${parts.join(', ')})`;
}

/**
 * 두 정지점 사이에 피그마 방식으로 섞은 중간 정지점을 만든다. 투명도나 RGB가 같으면 결과가 같아 만들지 않는다.
 * @param from 앞 정지점
 * @param to 뒤 정지점
 * @returns `#rrggbbaa 95%` 형태의 중간 정지점
 */
function interpolatedStops(from: ParsedStop, to: ParsedStop): string[] {
  const start = from.rgba;
  const end = to.rgba;
  const span = to.percent - from.percent;
  if (start === undefined || end === undefined || span <= 0) {
    return [];
  }
  const isSameAlpha = start[3] === end[3];
  const isSameRgb = start.slice(0, 3).every((channel, index) => channel === end[index]);
  if (isSameAlpha || isSameRgb) {
    return [];
  }
  const stops: string[] = [];
  for (let index = 1; index <= INTERPOLATION_STOPS; index++) {
    const ratio = index / (INTERPOLATION_STOPS + 1);
    const mixed = start.map((channel, channelIndex) => {
      const target = end[channelIndex] ?? channel;
      return channel + (target - channel) * ratio;
    });
    stops.push(`${hexOf(mixed)} ${formatNumber(from.percent + span * ratio)}%`);
  }
  return stops;
}

/**
 * 그림자 층 하나를 `box-shadow` 값으로 바꾼다.
 * @param layer `{offsetX, offsetY, blur, spread, color, inset}`
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns `0px 2px 4px 0px #0000000a`
 */
function shadowValue(layer: unknown, context: Context, source: string): string {
  const parts = shadowParts(layer, context, source);
  return isRecord(layer) && layer.inset === true ? `inset ${parts.join(' ')}` : parts.join(' ');
}

/**
 * 그림자 층 하나의 값을 CSS로 바꾼다.
 * @param layer `{offsetX, offsetY, blur, spread, color, inset}`
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns `[x, y, blur, spread, color]` CSS 값
 */
function shadowParts(
  layer: unknown,
  context: Context,
  source: string,
): [string, string, string, string, string] {
  if (!isRecord(layer)) {
    throw new TokenFormatError(source, '그림자 층은 객체여야 한다.');
  }
  /**
   * 그림자 길이 하나를 CSS 값으로 바꾼다.
   * @param key 값 이름
   * @returns CSS 길이
   */
  function length(key: string): string {
    const raw = isRecord(layer) ? layer[key] : undefined;
    return aliasReference(raw, context, source) ?? unitValue(raw, source);
  }
  const color = aliasReference(layer.color, context, source) ?? colorValue(layer.color, source);
  return [length('offsetX'), length('offsetY'), length('blur'), length('spread'), color];
}

/**
 * 별칭(`{a.b.c}`)이면 가리키는 변수의 `var()`를 만든다.
 * @param value 토큰 값
 * @param context 변환 표
 * @param source 오류 메시지에 쓸 경로
 * @returns `var(--a-b-c)`, 별칭이 아니면 undefined
 */
function aliasReference(value: unknown, context: Context, source: string): string | undefined {
  const target = aliasPath(value);
  if (target === undefined) {
    return undefined;
  }
  const token = context.variables.get(target);
  if (token === undefined) {
    throw new TokenFormatError(source, `별칭 ${target}이 가리키는 변수가 없다.`);
  }
  return `var(${cssName(token.path)})`;
}

/**
 * 별칭이 가리키는 변수 경로를 구한다.
 * @param value 토큰 값
 * @returns `a/b/c`, 별칭이 아니면 undefined
 */
function aliasPath(value: unknown): string | undefined {
  const match = typeof value === 'string' ? /^\{(.+)\}$/u.exec(value) : null;
  return match?.[1]?.split('.').join('/');
}

/**
 * 별칭이나 16진수 색을 끝까지 따라가 실제 RGBA(0~255)로 바꾼다.
 * @param value 색이나 별칭
 * @param context 변환 표
 * @returns RGBA, 알 수 없으면 undefined
 */
function resolvedRgba(value: unknown, context: Context): Rgba | undefined {
  let current = value;
  for (let depth = 0; depth <= context.variables.size; depth++) {
    const target = aliasPath(current);
    if (target === undefined) {
      return typeof current === 'string' ? parseHex(current) : undefined;
    }
    current = context.variables.get(target)?.value;
  }
  return undefined;
}

/**
 * 16진수 색을 RGBA(0~255)로 읽는다.
 * @param hex `#rrggbb`나 `#rrggbbaa`
 * @returns RGBA, 읽을 수 없으면 undefined
 */
function parseHex(hex: string): Rgba | undefined {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/iu.exec(hex);
  if (match === null) {
    return undefined;
  }
  const [, r = '00', g = '00', b = '00', a = 'ff'] = match;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16)];
}

/**
 * RGBA(0~255)를 `#rrggbbaa`로 쓴다.
 * @param channels 채널 값
 * @returns 16진수 색
 */
function hexOf(channels: readonly number[]): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 변수 표에서 토큰을 찾는 키를 만든다. `$root` 토큰은 별칭 경로와 같게 `a/b/$root`다.
 * @param token 변수 토큰
 * @returns 키
 */
function variableKey(token: FlatToken): string {
  return [...token.path, ...(token.isRoot ? [ROOT_TOKEN] : [])].join('/');
}

/**
 * 토큰 트리를 펼친다. `$type`은 묶음에서 물려받는다(DTCG).
 * 묶음의 `$root` 자식은 묶음 자신의 토큰이라 CSS 이름이 묶음 경로와 같다.
 * `$value`와 자식이 함께 있는 객체는 DTCG에서 쓸 수 없어 실패한다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param group 묶음
 * @param prefix 경로 앞부분
 * @param inheritedType 물려받은 `$type`
 * @returns 펼친 토큰
 */
function flattenTokens(
  group: Record<string, unknown>,
  prefix: readonly string[],
  inheritedType: string | undefined,
): FlatToken[] {
  const groupType = typeof group.$type === 'string' ? group.$type : inheritedType;
  const tokens: FlatToken[] = [];
  for (const [key, child] of Object.entries(group)) {
    const isRoot = key === ROOT_TOKEN;
    if ((key.startsWith('$') && !isRoot) || !isRecord(child)) {
      continue;
    }
    const path = isRoot ? [...prefix] : [...prefix, key];
    if ('$value' in child) {
      if (Object.keys(child).some((name) => !name.startsWith('$'))) {
        throw new TokenFormatError(
          path.join('/'),
          '$value와 자식 토큰이 함께 있다. 그룹 자신의 토큰은 $root에 둔다.',
        );
      }
      const type = typeof child.$type === 'string' ? child.$type : groupType;
      if (type === undefined) {
        throw new TokenFormatError(path.join('/'), '$type이 없다.');
      }
      tokens.push({
        path,
        isRoot,
        type,
        value: child.$value,
        extensions: isRecord(child.$extensions) ? child.$extensions : {},
      });
      continue;
    }
    if (isRoot) {
      throw new TokenFormatError(path.join('/'), '$root는 $value가 있는 토큰이어야 한다.');
    }
    tokens.push(...flattenTokens(child, path, groupType));
  }
  return tokens;
}

/**
 * 피그마 변수의 범위(scopes)를 구한다.
 * @param token 변수 토큰
 * @returns 범위 목록
 */
function scopesOf(token: FlatToken): string[] {
  const figma = token.extensions[FIGMA_EXTENSION];
  const scopes = isRecord(figma) ? figma.scopes : undefined;
  return Array.isArray(scopes) ? scopes.filter((scope) => typeof scope === 'string') : [];
}

/**
 * 피그마 변수 모음 이름을 구한다.
 * @param token 변수 토큰
 * @returns 모음 이름, 없으면 undefined
 */
function collectionOf(token: FlatToken): string | undefined {
  const figma = token.extensions[FIGMA_EXTENSION];
  const collection = isRecord(figma) ? figma.collection : undefined;
  return typeof collection === 'string' ? collection : undefined;
}

/**
 * 같은 CSS 이름이 둘 이상이면 실패한다.
 * @param variables CSS 변수
 */
function assertUniqueNames(variables: readonly CssVariable[]): void {
  const seen = new Map<string, string>();
  for (const variable of variables) {
    const previous = seen.get(variable.name);
    if (previous !== undefined) {
      throw new TokenFormatError(
        variable.source,
        `CSS 이름 ${variable.name}이 ${previous}와 겹친다. 피그마 이름을 고친다.`,
      );
    }
    seen.set(variable.name, variable.source);
  }
}

/**
 * 길이·시간 값(`{unit, value}`)을 CSS 값으로 바꾼다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns `20px`, `167ms`
 */
function unitValue(value: unknown, source: string): string {
  if (isRecord(value) && typeof value.unit === 'string' && typeof value.value === 'number') {
    return `${formatNumber(value.value)}${value.unit}`;
  }
  throw new TokenFormatError(source, `단위 값이 아니다(${JSON.stringify(value)}).`);
}

/**
 * 줄 높이를 CSS 값으로 바꾼다. 피그마 `AUTO`는 `normal`이다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns `20px`, `150%`, `normal`
 */
function lineHeightValue(value: unknown, source: string): string {
  return typeof value === 'string' && value.toLowerCase() === 'auto'
    ? 'normal'
    : unitValue(value, source);
}

/**
 * 자간을 CSS 값으로 바꾼다. 피그마 `%`는 글자 크기 기준이라 `em`이다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns `0em`, `0.5px`
 */
function letterSpacingValue(value: unknown, source: string): string {
  if (isRecord(value) && value.unit === '%' && typeof value.value === 'number') {
    return `${formatNumber(value.value / 100)}em`;
  }
  return unitValue(value, source);
}

/**
 * 16진수 색을 확인하고 소문자로 쓴다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns `#rrggbb[aa]`
 */
function colorValue(value: unknown, source: string): string {
  if (typeof value === 'string' && parseHex(value) !== undefined) {
    return value.toLowerCase();
  }
  throw new TokenFormatError(source, `16진수 색이 아니다(${JSON.stringify(value)}).`);
}

/**
 * 베지어 값을 `cubic-bezier()`로 바꾼다. 직선(피그마 LINEAR, `[0, 0, 1, 1]`)은 `linear`다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param value `[x1, y1, x2, y2]`
 * @param source 오류 메시지에 쓸 경로
 * @returns `cubic-bezier(0, 0, 0, 1)`, `linear`
 */
function easingValue(value: unknown, source: string): string {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TokenFormatError(source, '베지어 값은 숫자 네 개여야 한다.');
  }
  const numbers = value.map((n: unknown) => formatNumber(numberValue(n, source)));
  if (numbers.join(',') === LINEAR_BEZIER) {
    return 'linear';
  }
  return `cubic-bezier(${numbers.join(', ')})`;
}

/**
 * 숫자 값을 확인한다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns 숫자
 */
function numberValue(value: unknown, source: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw new TokenFormatError(source, `숫자가 아니다(${JSON.stringify(value)}).`);
}

/**
 * 글자 값을 확인한다.
 * @param value 토큰 값
 * @param source 오류 메시지에 쓸 경로
 * @returns 글자
 */
function stringValue(value: unknown, source: string): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new TokenFormatError(source, `글자가 아니다(${JSON.stringify(value)}).`);
}

/**
 * 서체 이름을 따옴표로 감싼다.
 * @param family 서체 이름
 * @returns `'Open Sans'`
 */
function quoteFamily(family: string): string {
  return `'${family.replace(/'/gu, "\\'")}'`;
}

/**
 * 소수 오차를 지운다.
 * @param value 숫자
 * @returns 정해진 자릿수로 반올림한 숫자
 */
function round(value: number): number {
  const factor = 10 ** NUMBER_PRECISION;
  return Math.round(value * factor) / factor;
}

/**
 * 숫자를 CSS 글자로 쓴다.
 * @param value 숫자
 * @returns 끝 0 없는 숫자 글자
 */
function formatNumber(value: number): string {
  const rounded = round(value);
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/**
 * 숫자 조각을 숫자 크기로 비교한다(`spacing-2` < `spacing-10`). 환경(ICU)에 따라 달라지지 않게 직접 비교한다.
 * @param a 앞 글자
 * @param b 뒤 글자
 * @returns 정렬 비교 값
 */
export function naturalCompare(a: string, b: string): number {
  const left = a.match(/\d+|\D+/gu) ?? [];
  const right = b.match(/\d+|\D+/gu) ?? [];
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const x = left[index] ?? '';
    const y = right[index] ?? '';
    if (x === y) {
      continue;
    }
    const isNumeric = /^\d/u.test(x) && /^\d/u.test(y);
    if (isNumeric && Number(x) !== Number(y)) {
      return Number(x) - Number(y);
    }
    return x < y ? -1 : 1;
  }
  return left.length - right.length;
}

/**
 * 중복을 지우고 정렬한다.
 * @param values 글자 목록
 * @returns 정렬한 목록
 */
function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(naturalCompare);
}

/**
 * 묶음 값을 객체로 확인한다. 없으면 빈 묶음이다.
 * @param value 값
 * @param source 오류 메시지에 쓸 경로
 * @returns 객체
 */
function asGroup(value: unknown, source: string): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new TokenFormatError(source, '객체여야 한다.');
  }
  return value;
}

/**
 * 값이 객체인지 확인한다.
 * @param value 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
