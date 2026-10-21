/**
 * figma/tokens.json(DTCG 형식)을 Tailwind v4 `@theme` 블록과 글자 스타일 `@utility`로 바꾼다.
 * 파일을 읽거나 쓰지 않는 순수 변환이다. 파일 입출력은 generate-tokens.ts가 맡는다.
 */

// 피그마 Variables 이름 경로에서 웹 서체 짝을 찾는 기준이다. 한글은 이 변수의 서체로 그린다.
const HANGUL_FAMILY_PATH = 'font/family/korean';
// 한글 전용 글자 스타일 묶음 이름이다. 웹에서는 서체 목록으로 글자마다 나뉘므로 따로 만들지 않는다.
const HANGUL_STYLE_GROUP = 'Hangul';
// 글자 그림자(`text-shadow`)로 쓰는 효과 스타일 묶음 이름이다.
const TEXT_SHADOW_GROUP = 'Text';
// 소수 오차(0.9599999785)를 지우기 위한 자릿수다.
const NUMBER_PRECISION = 4;

const GENERATED_HEADER = `/*
 * 이 파일은 scripts/tokens/generate-tokens.ts가 figma/tokens.json에서 만든다. 손으로 고치지 않는다.
 * 다시 만들기: pnpm --filter @seojaewan/design-system generate:tokens
 */`;

type TokenNode = {
  type: string;
  value: unknown;
  extensions: Record<string, unknown>;
};

type FlatToken = {
  path: string[];
  token: TokenNode;
};

type CssVariable = {
  name: string;
  value: string;
};

type ThemeSection = {
  title: string;
  variables: CssVariable[];
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
 * 토큰 JSON을 `src/tokens.css` 내용으로 바꾼다.
 * @codocs [[피그마 일치 검사:토큰 생성]]
 * @param tokens figma/tokens.json을 파싱한 값
 * @returns 단 하나의 `@theme static` 블록과 글자 스타일 유틸리티를 담은 CSS
 */
export function tokensToCss(tokens: unknown): string {
  if (!isRecord(tokens)) {
    throw new TokenFormatError('(root)', '토큰 JSON의 최상위는 객체여야 한다.');
  }
  const { style, ...variableGroups } = tokens;
  const variables = flattenTokens(variableGroups, []);
  const styles = isRecord(style) ? style : {};

  const names = new Map<string, string>();
  for (const { path } of variables) {
    names.set(path.join('/'), variableName(path));
  }
  const colors = resolvedColors(variables);

  const sections: ThemeSection[] = [
    { title: 'Variables', variables: variables.flatMap((item) => variableCss(item, names)) },
    {
      title: 'Effect styles',
      variables: flattenTokens(asGroup(styles.effect, 'style/effect'), []).flatMap((item) =>
        effectCss(item, names),
      ),
    },
    {
      title: 'Paint styles',
      variables: flattenTokens(asGroup(styles.paint, 'style/paint'), []).flatMap((item) =>
        paintCss(item, names, colors),
      ),
    },
  ];
  assertUniqueNames(sections.flatMap((section) => section.variables));

  const textStyles = flattenTokens(asGroup(styles.text, 'style/text'), []);
  const utilities = textUtilities(textStyles, names);

  const theme = sections
    .filter((section) => section.variables.length > 0)
    .map(
      (section) =>
        `  /* ${section.title} */\n` +
        section.variables.map((variable) => `  ${variable.name}: ${variable.value};`).join('\n'),
    )
    .join('\n\n');

  const themeBlock = theme === '' ? '@theme static {\n}' : `@theme static {\n${theme}\n}`;
  const blocks = [GENERATED_HEADER, themeBlock, ...utilities];
  return `${blocks.join('\n\n')}\n`;
}

/**
 * 피그마 변수 경로를 CSS 사용자 속성 이름으로 바꾼다.
 * Tailwind가 유틸리티를 만드는 이름공간이 있으면 그 이름공간을 쓴다.
 * @codocs [[디자인 기반:토큰 이름]]
 * @param path 변수 이름을 `/`로 나눈 경로
 * @returns `--`로 시작하는 CSS 사용자 속성 이름
 */
export function variableName(path: readonly string[]): string {
  const [group, subgroup, ...rest] = path;
  const joined = path.join('/');

  switch (group) {
    case 'color':
    case 'spacing':
    case 'radius':
    case 'blur':
    case 'opacity':
      return `--${group}-${tail([subgroup, ...rest])}`;
    case 'size':
      // 너비·높이 유틸리티(`h-*`, `size-*`)는 `--spacing-*`을 읽는다.
      return `--spacing-${tail([subgroup, ...rest])}`;
    case 'stroke-width':
      return `--border-width-${tail([subgroup, ...rest])}`;
    case 'font':
      return `--${fontNamespace(subgroup, joined)}-${tail(rest)}`;
    case 'motion':
      return `--motion-${tail([subgroup, ...rest])}`;
    default:
      // Semantic·Component 색 토큰(`text-fill/primary`)은 경로 그대로 `--color-*`이 된다.
      return `--color-${tail(path)}`;
  }
}

/**
 * 경로 조각들을 kebab-case로 바꿔 `-`로 잇는다.
 * @param segments 경로 조각(없는 조각은 건너뛴다)
 * @returns `text-fill-primary` 형태의 이름
 */
function tail(segments: readonly (string | undefined)[]): string {
  return segments
    .filter((segment): segment is string => segment !== undefined)
    .map(kebabSegment)
    .join('-');
}

/**
 * 스타일 이름 경로를 CSS 이름 조각으로 바꾼다. 공백과 괄호는 `-`가 된다.
 * @param segment 피그마 이름 조각(`Body Strong`, `Flyout (Acrylic)`)
 * @returns 소문자 kebab-case 조각
 */
export function kebabSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * `font/*` 변수의 두 번째 경로를 Tailwind 이름공간으로 바꾼다.
 * @param subgroup `family`, `weight`, `size`, `line-height`, `letter-spacing`
 * @param path 오류 메시지에 쓸 전체 경로
 * @returns Tailwind 이름공간(`font`, `font-weight`, `text`, `leading`, `tracking`)
 */
function fontNamespace(subgroup: string | undefined, path: string): string {
  switch (subgroup) {
    case 'family':
      return 'font';
    case 'weight':
      return 'font-weight';
    case 'size':
      return 'text';
    case 'line-height':
      return 'leading';
    case 'letter-spacing':
      return 'tracking';
    default:
      throw new TokenFormatError(path, '이름 규칙이 정해지지 않은 서체 변수다.');
  }
}

/**
 * 변수 하나를 CSS 사용자 속성으로 바꾼다. Tailwind 유틸리티용 별칭이 필요하면 함께 만든다.
 * @param item 경로와 토큰
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @returns 이 변수가 만드는 CSS 사용자 속성 목록
 */
function variableCss(item: FlatToken, names: ReadonlyMap<string, string>): CssVariable[] {
  const path = item.path.join('/');
  const name = names.get(path) ?? variableName(item.path);
  const value = variableValue(item, names);
  const result: CssVariable[] = [{ name, value }];
  const [group, subgroup, ...rest] = item.path;
  const suffix = tail(rest);

  if (group === 'font' && subgroup === 'line-height' && names.has(`font/size/${rest.join('/')}`)) {
    // `text-body`가 글자 크기와 줄 높이를 함께 정하게 한다.
    result.push({ name: `--text-${suffix}--line-height`, value: `var(${name})` });
  }
  if (group === 'motion' && subgroup === 'duration') {
    result.push({ name: `--transition-duration-${suffix}`, value: `var(${name})` });
  }
  if (group === 'motion' && subgroup === 'easing') {
    result.push({ name: `--ease-${suffix}`, value: `var(${name})` });
  }
  return result;
}

/**
 * 변수 값을 CSS 값으로 바꾼다. 별칭은 `var()` 참조로 남긴다.
 * @codocs [[디자인 기반:서체]]
 * @param item 경로와 토큰
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @returns CSS 값
 */
function variableValue(item: FlatToken, names: ReadonlyMap<string, string>): string {
  const path = item.path.join('/');
  const { type, value } = item.token;
  const alias = aliasReference(value, names, path);
  if (alias !== undefined) {
    return alias;
  }

  switch (type) {
    case 'color':
      return colorValue(value, path);
    case 'dimension':
    case 'duration':
      return unitValue(value, path);
    case 'number':
      return item.path[0] === 'opacity'
        ? `${formatNumber(numberValue(value, path))}%`
        : formatNumber(numberValue(value, path));
    case 'fontWeight':
      return formatNumber(numberValue(value, path));
    case 'fontFamily': {
      // 라틴 서체에는 한글 서체를 이어 붙여, 글자마다 라틴은 그 서체, 한글은 Pretendard로 그린다.
      const family = quoteFamily(stringValue(value, path));
      if (path === HANGUL_FAMILY_PATH) {
        return family;
      }
      const hangul = names.get(HANGUL_FAMILY_PATH);
      if (hangul === undefined) {
        throw new TokenFormatError(
          path,
          `${HANGUL_FAMILY_PATH} 변수가 없어 한글 서체를 붙일 수 없다.`,
        );
      }
      return `${family}, var(${hangul})`;
    }
    case 'cubicBezier':
      return easingValue(value, path);
    case 'string':
      return stringValue(value, path);
    default:
      throw new TokenFormatError(path, `처리하지 않는 $type "${type}"이다.`);
  }
}

/**
 * 효과 스타일을 그림자·블러 사용자 속성으로 바꾼다.
 * @param item 경로와 토큰
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @returns 그림자(`--shadow-*` 또는 `--text-shadow-*`)와 블러(`--blur-*`, `--backdrop-blur-*`) 속성
 */
function effectCss(item: FlatToken, names: ReadonlyMap<string, string>): CssVariable[] {
  const path = `style/effect/${item.path.join('/')}`;
  const layers = item.token.value;
  if (!Array.isArray(layers)) {
    throw new TokenFormatError(path, '효과 스타일의 $value는 그림자 배열이어야 한다.');
  }
  const isTextShadow = item.path[0] === TEXT_SHADOW_GROUP && item.path.length > 1;
  const nameTail = (isTextShadow ? item.path.slice(1) : item.path).map(kebabSegment).join('-');
  const result: CssVariable[] = [];

  if (layers.length > 0) {
    const shadows = layers.map((layer: unknown) => shadowValue(layer, isTextShadow, names, path));
    result.push({
      name: isTextShadow ? `--text-shadow-${nameTail}` : `--shadow-${nameTail}`,
      value: shadows.join(', '),
    });
  }

  const custom = item.token.extensions['com.seojaewan'];
  if (isRecord(custom)) {
    if (custom.backgroundBlur !== undefined) {
      result.push({
        name: `--backdrop-blur-${nameTail}`,
        value: blurValue(custom.backgroundBlur, names, path),
      });
    }
    if (custom.layerBlur !== undefined) {
      result.push({ name: `--blur-${nameTail}`, value: blurValue(custom.layerBlur, names, path) });
    }
  }
  return result;
}

/**
 * 칠 스타일을 사용자 속성으로 바꾼다.
 * - 단색 하나: `--color-*`
 * - 그라데이션(`$type: gradient`, WinUI 컨트롤 테두리): 층을 CSS 배경 목록으로 옮긴 `--gradient-*`
 * - 층이 여럿인 재질 스타일(`$type: color` + `layers`): theme.css에서 손으로 쓰므로 건너뛴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @param item 경로와 토큰
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param colors 색 변수 경로에서 별칭을 끝까지 따라간 실제 색으로 가는 표
 * @returns 사용자 속성(재질 스타일이면 빈 목록)
 */
function paintCss(
  item: FlatToken,
  names: ReadonlyMap<string, string>,
  colors: ReadonlyMap<string, string>,
): CssVariable[] {
  const path = `style/paint/${item.path.join('/')}`;
  const nameTail = item.path.map(kebabSegment).join('-');
  const custom = item.token.extensions['com.seojaewan'];
  const layers = isRecord(custom) ? custom.layers : undefined;
  if (item.token.type === 'gradient') {
    return [
      {
        name: `--gradient-${nameTail}`,
        value: gradientValue(item.token.value, layers, { names, colors }, path),
      },
    ];
  }
  if (layers !== undefined) {
    return [];
  }
  const value = aliasReference(item.token.value, names, path) ?? colorValue(item.token.value, path);
  return [{ name: `--color-${nameTail}`, value }];
}

/**
 * 그라데이션 칠 스타일을 CSS 배경 목록으로 바꾼다.
 * 피그마 층은 아래에서 위 순서이고 CSS 배경은 위에서 아래 순서라 뒤집는다.
 * `layers`가 없으면 `$value`의 정지점을 위에서 아래로 칠한다.
 * @param value `$value`의 정지점 목록
 * @param layers `com.seojaewan.layers`
 * @param context 변수 이름과 실제 색 표
 * @param path 오류 메시지에 쓸 경로
 * @returns `linear-gradient(...)`를 쉼표로 이은 값
 */
function gradientValue(
  value: unknown,
  layers: unknown,
  context: ColorContext,
  path: string,
): string {
  if (layers === undefined) {
    return linearGradient(topToBottom, value, 1, context, path);
  }
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new TokenFormatError(path, 'layers는 비어 있지 않은 배열이어야 한다.');
  }
  return layers
    .map((layer: unknown) => layerBackground(layer, context, path))
    .reverse()
    .join(', ');
}

/**
 * 칠 층 하나를 CSS 배경 이미지로 바꾼다.
 * @param layer `{type, color | gradientStops, gradientTransform, opacity}`
 * @param context 변수 이름과 실제 색 표
 * @param path 오류 메시지에 쓸 경로
 * @returns `linear-gradient(...)`
 */
function layerBackground(layer: unknown, context: ColorContext, path: string): string {
  if (!isRecord(layer)) {
    throw new TokenFormatError(path, '칠 층은 객체여야 한다.');
  }
  const opacity = layer.opacity === undefined ? 1 : numberValue(layer.opacity, path);
  if (layer.type === 'SOLID') {
    const color = layerColor(layer.color, opacity, context.names, path);
    return `linear-gradient(${color}, ${color})`;
  }
  if (layer.type === 'GRADIENT_LINEAR') {
    const axis = gradientAxis(layer.gradientTransform, path);
    return linearGradient(axis, layer.gradientStops, opacity, context, path);
  }
  throw new TokenFormatError(
    path,
    `그라데이션 스타일에서 처리하지 않는 층 ${String(layer.type)}이다.`,
  );
}

type GradientAxis = {
  /** CSS 방향(`to bottom`, `90deg` 등) */
  direction: string;
  /** 피그마 정지점 위치(0~1)를 CSS 정지점 위치(0~1)로 옮긴다 */
  position: (stop: number) => number;
};

const topToBottom: GradientAxis = { direction: 'to bottom', position: (stop) => stop };

/**
 * 피그마 gradientTransform에서 CSS 그라데이션 방향과 정지점 위치 변환을 구한다.
 * 변환의 역행렬로 노드 단위 좌표의 시작점(0, 0.5)과 끝점(1, 0.5)을 구한다.
 * 가로·세로 방향이면 정확히 옮기고, 비스듬하면 노드를 정사각형으로 보고 각도만 옮긴다.
 * @param transform `[[a, b, c], [d, e, f]]`
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 방향과 위치 변환
 */
function gradientAxis(transform: unknown, path: string): GradientAxis {
  const rows: unknown[] = Array.isArray(transform) ? transform : [];
  const [row0, row1] = rows;
  if (!Array.isArray(row0) || !Array.isArray(row1)) {
    throw new TokenFormatError(path, 'gradientTransform은 2×3 행렬이어야 한다.');
  }
  const [a, b, c] = row0.map((n: unknown) => numberValue(n, path));
  const [d, e, f] = row1.map((n: unknown) => numberValue(n, path));
  if ([a, b, c, d, e, f].some((n) => n === undefined)) {
    throw new TokenFormatError(path, 'gradientTransform은 2×3 행렬이어야 한다.');
  }
  const matrix = [a ?? 0, b ?? 0, c ?? 0, d ?? 0, e ?? 0, f ?? 0] as const;
  if (matrix[0] * matrix[4] - matrix[1] * matrix[3] === 0) {
    throw new TokenFormatError(path, 'gradientTransform의 역행렬이 없다.');
  }
  const [sx, sy] = toNodePoint(matrix, 0, 0.5);
  const [ex, ey] = toNodePoint(matrix, 1, 0.5);
  const dx = ex - sx;
  const dy = ey - sy;
  const epsilon = 1e-6;

  if (Math.abs(dx) < epsilon) {
    return dy > 0
      ? { direction: 'to bottom', position: (stop) => sy + stop * dy }
      : { direction: 'to top', position: (stop) => 1 - (sy + stop * dy) };
  }
  if (Math.abs(dy) < epsilon) {
    return dx > 0
      ? { direction: 'to right', position: (stop) => sx + stop * dx }
      : { direction: 'to left', position: (stop) => 1 - (sx + stop * dx) };
  }
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { direction: `${formatNumber((angle + 360) % 360)}deg`, position: (stop) => stop };
}

/**
 * 그라데이션 공간의 점을 노드 단위 좌표(0~1)로 옮긴다(gradientTransform의 역변환).
 * @param matrix `[a, b, c, d, e, f]`
 * @param gx 그라데이션 공간 x
 * @param gy 그라데이션 공간 y
 * @returns 노드 단위 좌표 `[x, y]`
 */
function toNodePoint(
  matrix: readonly [number, number, number, number, number, number],
  gx: number,
  gy: number,
): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  const det = a * e - b * d;
  return [(e * (gx - c) - b * (gy - f)) / det, (-d * (gx - c) + a * (gy - f)) / det];
}

type ColorContext = {
  /** 변수 경로에서 CSS 이름으로 가는 표 */
  names: ReadonlyMap<string, string>;
  /** 색 변수 경로에서 별칭을 끝까지 따라간 실제 색(#rrggbb[aa])으로 가는 표 */
  colors: ReadonlyMap<string, string>;
};

type Rgba = [number, number, number, number];

type ParsedStop = {
  /** CSS 색(별칭이면 var()) */
  css: string;
  /** CSS 정지점 위치(0~1) */
  position: number;
  /** 실제 색(0~255). 알 수 없으면 undefined */
  rgba: Rgba | undefined;
};

// 투명도가 다른 두 정지점 사이에 넣는 중간 정지점 수다. 피그마와의 색 차이가 반올림 오차 수준이 되는 값이다.
const INTERPOLATION_STOPS = 4;

/**
 * 정지점 목록을 `linear-gradient()`로 바꾼다.
 * 피그마는 정지점 사이 색을 투명도와 따로(투명도를 곱하지 않고) 섞고, CSS는 투명도를 곱한 값으로 섞는다.
 * 투명도가 다른 두 정지점 사이에는 피그마 방식으로 계산한 중간 정지점을 넣어 같은 색이 나오게 한다.
 * @codocs [[피그마 일치 검사:토큰 생성]]
 * @param axis 방향과 위치 변환
 * @param stops `[{color, position}]`
 * @param opacity 층 불투명도
 * @param context 변수 이름과 실제 색 표
 * @param path 오류 메시지에 쓸 경로
 * @returns `linear-gradient(to bottom, var(--color-x) 90.58%, ...)`
 */
function linearGradient(
  axis: GradientAxis,
  stops: unknown,
  opacity: number,
  context: ColorContext,
  path: string,
): string {
  if (!Array.isArray(stops) || stops.length === 0) {
    throw new TokenFormatError(path, '그라데이션 정지점은 비어 있지 않은 배열이어야 한다.');
  }
  const parsed = stops.map((stop: unknown) => gradientStop(stop, axis, opacity, context, path));
  const parts: string[] = [];
  for (const [index, stop] of parsed.entries()) {
    parts.push(`${stop.css} ${formatNumber(stop.position * 100)}%`);
    const next = parsed[index + 1];
    if (next !== undefined) {
      parts.push(...interpolatedStops(stop, next));
    }
  }
  return `linear-gradient(${axis.direction}, ${parts.join(', ')})`;
}

/**
 * 두 정지점 사이에 피그마 방식(투명도를 곱하지 않고 섞기)으로 계산한 중간 정지점을 만든다.
 * 투명도나 RGB가 같으면 CSS와 피그마의 결과가 같으므로 만들지 않는다.
 * @param from 앞 정지점
 * @param to 뒤 정지점
 * @returns `#rrggbbaa 95%` 형태의 중간 정지점 목록
 */
function interpolatedStops(from: ParsedStop, to: ParsedStop): string[] {
  const start = from.rgba;
  const end = to.rgba;
  const span = to.position - from.position;
  if (start === undefined || end === undefined || span <= 0) {
    return [];
  }
  // 투명도나 RGB 중 하나가 같으면 두 방식의 결과가 같다.
  const isSameAlpha = start[3] === end[3];
  const isSameRgb = start.slice(0, 3).every((channel, index) => channel === end[index]);
  if (isSameAlpha || isSameRgb) {
    return [];
  }
  const stops: string[] = [];
  for (let index = 1; index <= INTERPOLATION_STOPS; index++) {
    const ratio = index / (INTERPOLATION_STOPS + 1);
    const hex = start.map((channel, channelIndex) =>
      mixedChannel(channel, end[channelIndex] ?? channel, ratio),
    );
    stops.push(`#${hex.join('')} ${formatNumber((from.position + span * ratio) * 100)}%`);
  }
  return stops;
}

/**
 * 색 채널 하나를 비율대로 섞어 16진수 두 자리로 쓴다.
 * @param from 시작 값(0~255)
 * @param to 끝 값(0~255)
 * @param ratio 끝 값의 비율(0~1)
 * @returns `00`~`ff`
 */
function mixedChannel(from: number, to: number, ratio: number): string {
  return Math.round(from + (to - from) * ratio)
    .toString(16)
    .padStart(2, '0');
}

/**
 * 정지점 하나를 읽는다.
 * @param stop `{color, position}`
 * @param axis 방향과 위치 변환
 * @param opacity 층 불투명도
 * @param context 변수 이름과 실제 색 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 색, 위치, 실제 색
 */
function gradientStop(
  stop: unknown,
  axis: GradientAxis,
  opacity: number,
  context: ColorContext,
  path: string,
): ParsedStop {
  if (!isRecord(stop)) {
    throw new TokenFormatError(path, '그라데이션 정지점은 {color, position}이어야 한다.');
  }
  const rgba = resolvedRgba(stop.color, context.colors);
  return {
    css: layerColor(stop.color, opacity, context.names, path),
    position: axis.position(numberValue(stop.position, path)),
    rgba: rgba === undefined ? undefined : [rgba[0], rgba[1], rgba[2], rgba[3] * opacity],
  };
}

/**
 * 별칭이나 16진수 색을 실제 RGBA(0~255)로 바꾼다.
 * @param color 16진수 색이나 별칭
 * @param colors 색 변수 경로에서 실제 색으로 가는 표
 * @returns RGBA. 알 수 없으면 undefined
 */
function resolvedRgba(color: unknown, colors: ReadonlyMap<string, string>): Rgba | undefined {
  if (typeof color !== 'string') {
    return undefined;
  }
  const alias = /^\{(.+)\}$/u.exec(color)?.[1];
  const hex = alias === undefined ? color : colors.get(alias.split('.').join('/'));
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/iu.exec(hex ?? '');
  if (match === null) {
    return undefined;
  }
  const [, r = '00', g = '00', b = '00', a = 'ff'] = match;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16)];
}

/**
 * 색 변수의 별칭을 끝까지 따라가 실제 색 표를 만든다.
 * @param variables 펼친 변수 목록
 * @returns 변수 경로에서 실제 색(#rrggbb[aa])으로 가는 표
 */
function resolvedColors(variables: readonly FlatToken[]): Map<string, string> {
  const raw = new Map(variables.map((item) => [item.path.join('/'), item.token.value]));
  const colors = new Map<string, string>();
  for (const item of variables) {
    if (item.token.type !== 'color') {
      continue;
    }
    let value: unknown = item.token.value;
    for (let depth = 0; depth < raw.size && typeof value === 'string'; depth++) {
      const alias = /^\{(.+)\}$/u.exec(value)?.[1];
      if (alias === undefined) {
        break;
      }
      value = raw.get(alias.split('.').join('/'));
    }
    if (typeof value === 'string' && value.startsWith('#')) {
      colors.set(item.path.join('/'), value);
    }
  }
  return colors;
}

/**
 * 칠 층의 색에 층 불투명도를 적용한다. 별칭이면 `color-mix()`로 섞는다.
 * @param color 16진수 색이나 별칭
 * @param opacity 층 불투명도(0~1)
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 색
 */
function layerColor(
  color: unknown,
  opacity: number,
  names: ReadonlyMap<string, string>,
  path: string,
): string {
  const value = aliasReference(color, names, path) ?? colorValue(color, path);
  if (opacity >= 1) {
    return value;
  }
  return `color-mix(in srgb, ${value} ${formatNumber(opacity * 100)}%, transparent)`;
}

/**
 * 글자 스타일을 `@utility type-*` 블록으로 바꾼다.
 * `Hangul/*` 스타일은 짝인 라틴 스타일과 크기·줄 높이·굵기가 같은지만 확인하고 따로 만들지 않는다.
 * @codocs [[디자인 기반:서체]]
 * @param styles 글자 스타일 목록
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @returns `@utility` 블록 목록
 */
function textUtilities(styles: readonly FlatToken[], names: ReadonlyMap<string, string>): string[] {
  const byPath = new Map(styles.map((item) => [item.path.join('/'), item]));
  const utilities: string[] = [];
  const seen = new Set<string>();

  for (const item of styles) {
    const path = `style/text/${item.path.join('/')}`;
    const fields = item.token.value;
    if (!isRecord(fields)) {
      throw new TokenFormatError(path, '글자 스타일의 $value는 객체여야 한다.');
    }

    if (item.path[0] === HANGUL_STYLE_GROUP && item.path.length > 1) {
      const latin = byPath.get(item.path.slice(1).join('/'));
      if (latin === undefined || !isRecord(latin.token.value)) {
        throw new TokenFormatError(path, '짝이 되는 라틴 글자 스타일이 없다.');
      }
      for (const field of ['fontSize', 'lineHeight', 'fontWeight', 'letterSpacing']) {
        if (JSON.stringify(fields[field]) !== JSON.stringify(latin.token.value[field])) {
          throw new TokenFormatError(path, `${field}가 라틴 글자 스타일과 다르다.`);
        }
      }
      continue;
    }

    const name = `type-${item.path.map(kebabSegment).join('-')}`;
    if (seen.has(name)) {
      throw new TokenFormatError(path, `유틸리티 이름 ${name}이 겹친다.`);
    }
    seen.add(name);

    const declarations = [
      ['font-family', fontFamilyValue(fields.fontFamily, names, path)],
      ['font-size', styleUnitValue(fields.fontSize, names, `${path}/fontSize`)],
      ['font-weight', styleNumberValue(fields.fontWeight, names, `${path}/fontWeight`)],
      ['line-height', styleUnitValue(fields.lineHeight, names, `${path}/lineHeight`)],
      ['letter-spacing', letterSpacingValue(fields.letterSpacing, names, `${path}/letterSpacing`)],
    ] as const;
    utilities.push(
      `@utility ${name} {\n${declarations
        .map(([property, value]) => `  ${property}: ${value};`)
        .join('\n')}\n}`,
    );
  }
  return utilities;
}

/**
 * 그룹을 따라 내려가며 `$value`를 가진 토큰을 모은다.
 * @param group 토큰 그룹
 * @param prefix 지금까지의 경로
 * @returns 경로 순서대로 모은 토큰
 */
function flattenTokens(group: Record<string, unknown>, prefix: readonly string[]): FlatToken[] {
  const tokens: FlatToken[] = [];
  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith('$')) {
      continue;
    }
    const path = [...prefix, key];
    if (!isRecord(child)) {
      throw new TokenFormatError(path.join('/'), '토큰이나 그룹은 객체여야 한다.');
    }
    if (!('$value' in child)) {
      tokens.push(...flattenTokens(child, path));
      continue;
    }
    const type = child.$type;
    if (typeof type !== 'string') {
      throw new TokenFormatError(path.join('/'), '$type이 없다.');
    }
    const extensions = isRecord(child.$extensions) ? child.$extensions : {};
    tokens.push({ path, token: { type, value: child.$value, extensions } });
  }
  return tokens;
}

/**
 * `{color.gray.f9f9f9}` 같은 별칭을 `var()` 참조로 바꾼다.
 * @param value 토큰 값
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns 별칭이면 `var(--...)`, 아니면 undefined
 */
function aliasReference(
  value: unknown,
  names: ReadonlyMap<string, string>,
  path: string,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = /^\{(.+)\}$/u.exec(value);
  if (match?.[1] === undefined) {
    return undefined;
  }
  const target = match[1].split('.').join('/');
  const name = names.get(target);
  if (name === undefined) {
    throw new TokenFormatError(path, `별칭 ${value}이 가리키는 변수가 없다.`);
  }
  return `var(${name})`;
}

/**
 * 그림자 층 하나를 CSS 그림자 값으로 바꾼다.
 * @param layer `{color, offsetX, offsetY, blur, spread, inset}`
 * @param isTextShadow 글자 그림자면 퍼짐과 안쪽 그림자를 쓰지 않는다
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns `0px 2px 4px 0px #0000000a` 형태의 값
 */
function shadowValue(
  layer: unknown,
  isTextShadow: boolean,
  names: ReadonlyMap<string, string>,
  path: string,
): string {
  if (!isRecord(layer)) {
    throw new TokenFormatError(path, '그림자 층은 객체여야 한다.');
  }
  const color = aliasReference(layer.color, names, path) ?? colorValue(layer.color, path);
  const lengths = [layer.offsetX, layer.offsetY, layer.blur].map((length) =>
    lengthValue(length, names, path),
  );
  if (isTextShadow) {
    return [...lengths, color].join(' ');
  }
  const spread = lengthValue(layer.spread ?? 0, names, path);
  const inset = layer.inset === true ? 'inset ' : '';
  return `${inset}${[...lengths, spread, color].join(' ')}`;
}

/**
 * 블러 반경을 CSS 길이로 바꾼다.
 * @param value 숫자, `{value, unit}`, 또는 별칭
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 길이
 */
function blurValue(value: unknown, names: ReadonlyMap<string, string>, path: string): string {
  return lengthValue(value, names, path);
}

/**
 * 숫자(px), `{value, unit}`, 별칭 중 하나를 CSS 길이로 바꾼다.
 * @param value 길이 값
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 길이
 */
function lengthValue(value: unknown, names: ReadonlyMap<string, string>, path: string): string {
  if (typeof value === 'number') {
    return `${formatNumber(value)}px`;
  }
  return aliasReference(value, names, path) ?? unitValue(value, path);
}

/**
 * 글자 스타일의 서체 값을 바꾼다. 리터럴 라틴 서체에도 한글 서체를 붙인다.
 * @param value 별칭이나 서체 이름
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS `font-family` 값
 */
function fontFamilyValue(value: unknown, names: ReadonlyMap<string, string>, path: string): string {
  const alias = aliasReference(value, names, path);
  if (alias !== undefined) {
    return alias;
  }
  return variableValue(
    { path: ['font', 'family', 'literal'], token: { type: 'fontFamily', value, extensions: {} } },
    names,
  );
}

/**
 * 글자 스타일의 길이 값(크기, 줄 높이)을 바꾼다.
 * @param value 별칭이나 `{value, unit: "px" | "%"}`
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 값
 */
function styleUnitValue(value: unknown, names: ReadonlyMap<string, string>, path: string): string {
  return aliasReference(value, names, path) ?? unitValue(value, path);
}

/**
 * 글자 스타일의 숫자 값(굵기)을 바꾼다.
 * @param value 별칭이나 숫자
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 값
 */
function styleNumberValue(
  value: unknown,
  names: ReadonlyMap<string, string>,
  path: string,
): string {
  return aliasReference(value, names, path) ?? formatNumber(numberValue(value, path));
}

/**
 * 자간을 CSS 값으로 바꾼다. 피그마의 % 자간은 글자 크기 대비라 `em`으로 옮긴다.
 * @param value 별칭이나 `{value, unit: "px" | "%"}`
 * @param names 변수 경로에서 CSS 이름으로 가는 표
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 값
 */
function letterSpacingValue(
  value: unknown,
  names: ReadonlyMap<string, string>,
  path: string,
): string {
  const alias = aliasReference(value, names, path);
  if (alias !== undefined) {
    return alias;
  }
  if (isRecord(value) && value.unit === '%') {
    return `${formatNumber(numberValue(value.value, path) / 100)}em`;
  }
  return unitValue(value, path);
}

/**
 * `{value, unit}`을 CSS 값으로 바꾼다.
 * @param value 단위가 있는 값
 * @param path 오류 메시지에 쓸 경로
 * @returns `14px`, `83ms`, `120%` 형태의 값
 */
function unitValue(value: unknown, path: string): string {
  if (!isRecord(value) || typeof value.unit !== 'string') {
    throw new TokenFormatError(path, '단위가 있는 값은 {value, unit}이어야 한다.');
  }
  return `${formatNumber(numberValue(value.value, path))}${value.unit}`;
}

/**
 * 색 값을 확인하고 소문자 16진수로 돌려준다.
 * @param value `#rrggbb` 또는 `#rrggbbaa`
 * @param path 오류 메시지에 쓸 경로
 * @returns 소문자 16진수 색
 */
function colorValue(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/iu.test(value)) {
    throw new TokenFormatError(path, '색은 #rrggbb나 #rrggbbaa여야 한다.');
  }
  return value.toLowerCase();
}

/**
 * 이징 값을 CSS `cubic-bezier()`로 바꾼다. 문자열(`linear`)은 그대로 둔다.
 * @param value `[x1, y1, x2, y2]` 또는 CSS 이징 문자열
 * @param path 오류 메시지에 쓸 경로
 * @returns CSS 이징 값
 */
function easingValue(value: unknown, path: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TokenFormatError(path, 'cubicBezier는 숫자 네 개의 배열이어야 한다.');
  }
  const points = value.map((point: unknown) => formatNumber(numberValue(point, path)));
  return `cubic-bezier(${points.join(', ')})`;
}

/**
 * 숫자 값을 확인한다.
 * @param value 숫자여야 하는 값
 * @param path 오류 메시지에 쓸 경로
 * @returns 숫자
 */
function numberValue(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TokenFormatError(path, '숫자여야 한다.');
  }
  return value;
}

/**
 * 문자열 값을 확인한다.
 * @param value 문자열이어야 하는 값
 * @param path 오류 메시지에 쓸 경로
 * @returns 문자열
 */
function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TokenFormatError(path, '비어 있지 않은 문자열이어야 한다.');
  }
  return value;
}

/**
 * 서체 이름을 작은따옴표로 감싼다.
 * @param family 서체 이름
 * @returns `'Open Sans'`
 */
function quoteFamily(family: string): string {
  return `'${family.replace(/'/gu, "\\'")}'`;
}

/**
 * 피그마가 남긴 부동소수 오차를 지운다.
 * @param value 숫자
 * @returns 정해진 자릿수로 반올림한 숫자 문자열
 */
function formatNumber(value: number): string {
  return String(Number(value.toFixed(NUMBER_PRECISION)));
}

/**
 * 스타일 그룹이 객체인지 확인한다. 없으면 빈 그룹으로 본다.
 * @param value 그룹 값
 * @param path 오류 메시지에 쓸 경로
 * @returns 그룹 객체
 */
function asGroup(value: unknown, path: string): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new TokenFormatError(path, '스타일 그룹은 객체여야 한다.');
  }
  return value;
}

/**
 * 서로 다른 토큰이 같은 CSS 이름으로 바뀌지 않았는지 확인한다.
 * @param variables 만든 CSS 사용자 속성 목록
 */
function assertUniqueNames(variables: readonly CssVariable[]): void {
  const seen = new Set<string>();
  for (const { name } of variables) {
    if (seen.has(name)) {
      throw new TokenFormatError(name, '서로 다른 토큰이 같은 CSS 이름으로 바뀐다.');
    }
    seen.add(name);
  }
}

/**
 * 값이 일반 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체이고 배열이 아니면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
