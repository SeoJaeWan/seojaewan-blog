/**
 * 모션 스토리의 CSS 키프레임 값을 json(`figma/motions/<이름>.json`) 키프레임 값과 비교한다(키프레임 값 검사).
 * 파일과 브라우저를 모르는 순수 함수다. 브라우저에서 읽은 값은 motion-check.spec.ts가 넘긴다.
 * - 코드 값은 `getKeyframes()`가 돌려준 키프레임 값이다. 토큰 `var()`는 브라우저가 푼 값이다.
 * - 실행 중 값은 키프레임 선언(CSSOM)에서 토큰이 아닌 CSS 변수를 쓰는 자리로 가리고, 값 대신 변수를 쓰는지와 부호만 본다.
 */

/** json 키프레임 하나의 위치(0~1)와 값 */
export type ValueKeyframe = { offset: number; value: unknown };

/** json 트랙 하나의 키프레임 값 */
export type ValueTrack = {
  /** 노드 이름(컴포넌트·자산·레이어 이름) */
  node: string;
  /** 견본 기준 레이어 경로 */
  path: string;
  /** 피그마 항목(`OPACITY`, `SCALE_XY`, `PATH_TRIM_END` 등) */
  property: string;
  /** 피그마 트랙 연산(`SET`, `OFFSET`, `SCALE`) */
  operation: string;
  /** 트랙 길이(ms). 표에 키프레임 시간을 쓸 때만 쓴다 */
  durationMs: number;
  keyframes: ValueKeyframe[];
};

/** 키프레임 하나의 CSS 값(속성 이름은 kebab-case) */
export type CssKeyframe = { offset: number; values: Readonly<Record<string, string>> };

/** 브라우저에서 읽은 CSS 애니메이션 하나의 키프레임 */
export type ObservedEffect = {
  /** `animation-name` */
  name: string;
  /** 애니메이션이 걸린 요소 설명(메시지용) */
  target: string;
  /** 스토리 안 요소 번호. 같은 요소의 애니메이션은 번호가 같다 */
  element: number;
  /** 요소의 `data-motion-node` 값(같은 CSS 속성을 움직이는 요소가 여럿일 때 json 노드를 가리킨다) */
  node: string | null;
  /** 요소의 레이아웃 크기(px). `translate`의 %를 px로 바꿀 때 쓴다 */
  box: { width: number; height: number };
  /** SVG 경로 길이(`pathLength` 속성, 없으면 실제 길이). 경로가 아니면 null */
  pathLength: number | null;
  /** `getKeyframes()` 값. 브라우저가 `var()`를 푼 값이다 */
  keyframes: CssKeyframe[];
  /** `@keyframes` 규칙에 쓴 선언 그대로(`var()` 포함) */
  declarations: CssKeyframe[];
};

/** 비교 결과 */
export type ValueStatus =
  /** 허용 오차 안에서 같다 */
  | 'same'
  /** 다르다 */
  | 'different'
  /** 실행 중 값 CSS 변수를 쓰고 부호가 같다 */
  | 'runtime'
  /** 비교할 수 없다(코드 키프레임 없음, 변환표에 없는 항목 등) */
  | 'missing';

/** 결과 표 한 줄 */
export type ValueRow = {
  /** `0%`, `50% (1000ms)` */
  keyframe: string;
  /** `WindowFrame OPACITY → opacity` */
  property: string;
  /** 피그마 값 */
  figma: string;
  /** 코드 값 */
  code: string;
  status: ValueStatus;
  /** 결과 설명(다를 때 이유) */
  note: string;
};

/** 피그마 값 꼴 */
type Shape = 'number' | 'xy';

/** 피그마 항목 → CSS 속성 변환 규칙 */
type Conversion = {
  /** 값을 읽는 CSS 속성. 앞이 우선이고, 없으면 `transform`에서 읽는다 */
  css: readonly string[];
  shape: Shape;
  /** 같다고 보는 차이 */
  tolerance: number;
  /** 값 단위(표 표시용) */
  unit: string;
  /** 성분 하나를 고른다(SCALE_X 등). 없으면 xy 전체 또는 숫자 */
  axis?: 'x' | 'y';
};

// 허용 오차: 피그마가 내보낸 값의 반올림과 CSS 계산값의 부동소수 차이만 넘긴다.
/** 투명도·배율·경로 트림(0~1 비율) */
export const RATIO_TOLERANCE = 1e-3;
/** 이동(px) */
export const LENGTH_TOLERANCE = 0.5;
/** 회전(deg) */
export const ANGLE_TOLERANCE = 0.5;
// 키프레임 위치를 같다고 보는 차이다.
const OFFSET_TOLERANCE = 1e-3;
const PERCENT = 100;

const scale: Omit<Conversion, 'shape'> = {
  css: ['scale'],
  tolerance: RATIO_TOLERANCE,
  unit: '',
};
const translate: Omit<Conversion, 'shape'> = {
  css: ['translate'],
  tolerance: LENGTH_TOLERANCE,
  unit: 'px',
};

/**
 * 피그마 항목 → CSS 속성 변환표. 여기에 없는 항목(크기, 반경, 칠 등)은 비교할 수 없어 실패한다.
 * 규칙을 먼저 정해 이 표와 [[피그마 연동:모션]]에 더한다.
 * @codocs [[피그마 연동:모션]]
 */
export const conversions: ReadonlyMap<string, Conversion> = new Map<string, Conversion>([
  ['OPACITY', { css: ['opacity'], shape: 'number', tolerance: RATIO_TOLERANCE, unit: '' }],
  ['SCALE_XY', { ...scale, shape: 'xy' }],
  ['SCALE_X', { ...scale, shape: 'number', axis: 'x' }],
  ['SCALE_Y', { ...scale, shape: 'number', axis: 'y' }],
  ['TRANSLATION_XY', { ...translate, shape: 'xy' }],
  ['TRANSLATION_X', { ...translate, shape: 'number', axis: 'x' }],
  ['TRANSLATION_Y', { ...translate, shape: 'number', axis: 'y' }],
  ['ROTATION', { css: ['rotate'], shape: 'number', tolerance: ANGLE_TOLERANCE, unit: '°' }],
  [
    'PATH_TRIM_START',
    { css: ['stroke-dashoffset'], shape: 'number', tolerance: RATIO_TOLERANCE, unit: '' },
  ],
  [
    'PATH_TRIM_END',
    {
      css: ['stroke-dasharray', 'stroke-dashoffset'],
      shape: 'number',
      tolerance: RATIO_TOLERANCE,
      unit: '',
    },
  ],
]);

// 피그마 항목 → `transform` 함수에서 읽을 때 쓰는 이름이다.
const TRANSFORM_PROPERTY = 'transform';
const transformKinds: ReadonlyMap<string, 'scale' | 'translate' | 'rotate'> = new Map([
  ['SCALE_XY', 'scale'],
  ['SCALE_X', 'scale'],
  ['SCALE_Y', 'scale'],
  ['TRANSLATION_XY', 'translate'],
  ['TRANSLATION_X', 'translate'],
  ['TRANSLATION_Y', 'translate'],
  ['ROTATION', 'rotate'],
] as const);
const SET_OPERATION = 'SET';
// getKeyframes()가 키프레임마다 붙이는 속성이 아닌 값이다.
const nonPropertyKeys: ReadonlySet<string> = new Set([
  'offset',
  'computed-offset',
  'easing',
  'composite',
]);

/** 키프레임 하나에서 읽은 값 */
type Vector = { x: number; y: number };
/** 키프레임 하나에서 읽은 코드 값과 실행 중 값 변수 */
type CodeValue = {
  /** 피그마 단위로 옮긴 값 */
  value: Vector;
  /** 표에 쓰는 CSS 선언(`getKeyframes()` 값) */
  text: string;
  /** 표에 쓰는 `@keyframes` 선언 그대로(`var()` 포함) */
  declaredText: string;
  /** CSS 값과 피그마 값의 꼴이 달라(회전 부호, %, 경로 트림, transform) 옮긴 값을 함께 보일지 */
  isConverted: boolean;
  /** 성분마다 쓴 실행 중 값 변수(토큰이 아닌 CSS 변수) */
  runtime: { x: string[]; y: string[] };
};

/**
 * json 트랙의 키프레임 값을 모션 스토리의 CSS 키프레임과 비교해 결과 표 줄을 만든다.
 * - 트랙은 그 항목의 CSS 속성을 움직이는 요소와 짝짓는다. 그런 요소가 여럿이면 `data-motion-node`가 json의
 *   노드 이름(또는 경로)과 같은 요소, 없으면 표시가 없는 요소 하나와 짝짓는다.
 * - 키프레임 위치마다 값을 비교하고, 코드에만 있는 키프레임과 피그마 트랙이 없는 CSS 속성도 실패로 적는다.
 * - 실행 중 값(토큰이 아닌 CSS 변수)은 값 대신 그 자리에 변수를 쓰는지와 부호(방향)만 본다.
 * @codocs [[피그마 연동:모션]]
 * @param tracks json 트랙
 * @param effects 모션 스토리의 CSS 애니메이션
 * @param tokenVariables 토큰 CSS 변수 이름(`--motion-scale-window-enter` 등). 여기에 없는 변수는 실행 중 값이다
 * @returns 결과 표 줄
 */
export function compareMotionValues(
  tracks: readonly ValueTrack[],
  effects: readonly ObservedEffect[],
  tokenVariables: ReadonlySet<string>,
): ValueRow[] {
  const rows: ValueRow[] = [];
  const claimed = new Set<string>();
  for (const track of tracks) {
    rows.push(...compareTrack(track, effects, tokenVariables, claimed));
  }
  for (const effect of effects) {
    for (const property of animatedProperties(effect)) {
      if (!claimed.has(claimKey(effect.element, property))) {
        rows.push({
          keyframe: '-',
          property: `${effect.target} → ${property}`,
          figma: '트랙 없음',
          code: effect.name,
          status: 'missing',
          note: '피그마 견본에 없는 움직임이다',
        });
      }
    }
  }
  return rows;
}

/**
 * 결과 줄이 실패인지 본다.
 * @param row 결과 표 줄
 * @returns 다르거나 비교할 수 없으면 true
 */
export function isFailedRow(row: ValueRow): boolean {
  return row.status === 'different' || row.status === 'missing';
}

/**
 * 트랙 하나를 비교한다.
 * @param track json 트랙
 * @param effects CSS 애니메이션
 * @param tokenVariables 토큰 CSS 변수 이름
 * @param claimed 짝지은 요소·CSS 속성(바꾼다)
 * @returns 결과 표 줄
 */
function compareTrack(
  track: ValueTrack,
  effects: readonly ObservedEffect[],
  tokenVariables: ReadonlySet<string>,
  claimed: Set<string>,
): ValueRow[] {
  const label = `${track.node} ${track.property}`;
  const conversion = conversions.get(track.property);
  if (conversion === undefined || track.operation !== SET_OPERATION) {
    return [
      missingRow(
        label,
        conversion === undefined
          ? `변환표에 없는 항목이다. [[피그마 연동:모션]] 변환표와 motion-values.ts에 규칙을 먼저 더한다`
          : `${track.operation} 연산은 값을 비교할 수 없다(SET만 비교한다)`,
      ),
    ];
  }
  const found = pairEffects(track, conversion, effects);
  if (!found.ok) {
    return [missingRow(label, found.message)];
  }
  const { pair, css } = found;
  for (const property of css) {
    claimed.add(claimKey(pair.element, property));
  }
  const rows: ValueRow[] = [];
  const name = `${label} → ${css.join(', ')}`;
  for (const keyframe of track.keyframes) {
    rows.push(compareKeyframe(track, conversion, keyframe, pair, name, tokenVariables));
  }
  const figmaOffsets = track.keyframes.map((keyframe) => keyframe.offset);
  for (const offset of codeOffsets(pair, css)) {
    if (!figmaOffsets.some((item) => isSameOffset(item, offset))) {
      rows.push({
        keyframe: offsetText(offset, track.durationMs),
        property: name,
        figma: '키프레임 없음',
        code: cssText(keyframeAt(pair.keyframes, offset), css),
        status: 'missing',
        note: '피그마 트랙에 없는 키프레임이다',
      });
    }
  }
  return rows;
}

/**
 * 키프레임 하나를 비교한다.
 * @param track json 트랙
 * @param conversion 변환 규칙
 * @param keyframe json 키프레임
 * @param pair 짝지은 요소의 CSS 키프레임
 * @param name 표에 쓰는 속성 이름
 * @param tokenVariables 토큰 CSS 변수 이름
 * @returns 결과 표 줄
 */
function compareKeyframe(
  track: ValueTrack,
  conversion: Conversion,
  keyframe: ValueKeyframe,
  pair: PairedEffect,
  name: string,
  tokenVariables: ReadonlySet<string>,
): ValueRow {
  const base = { keyframe: offsetText(keyframe.offset, track.durationMs), property: name };
  const figma = figmaVector(keyframe.value, conversion);
  const figmaText = figma === null ? JSON.stringify(keyframe.value) : vectorText(figma, conversion);
  if (figma === null) {
    return {
      ...base,
      figma: figmaText,
      code: '',
      status: 'missing',
      note: `${track.property} 값의 꼴을 읽지 못했다`,
    };
  }
  const computed = keyframeAt(pair.keyframes, keyframe.offset);
  const declared = keyframeAt(pair.declarations, keyframe.offset);
  const code =
    computed === undefined
      ? null
      : codeValue(track.property, conversion, computed, declared, pair, tokenVariables);
  if (code === null || typeof code === 'string') {
    return {
      ...base,
      figma: figmaText,
      code: computed === undefined ? '키프레임 없음' : cssText(computed, conversion.css),
      status: 'missing',
      note: code ?? '이 위치에 CSS 키프레임이 없다',
    };
  }
  const axes = axesOf(conversion);
  const runtimeAxes = axes.filter((axis) => code.runtime[axis].length > 0);
  const valueAxes = axes.filter((axis) => code.runtime[axis].length === 0);
  const differentValue = valueAxes.filter(
    (axis) => Math.abs(figma[axis] - code.value[axis]) > conversion.tolerance,
  );
  const differentSign = runtimeAxes.filter(
    (axis) =>
      signOf(figma[axis], conversion.tolerance) !== signOf(code.value[axis], conversion.tolerance),
  );
  const variables = [...new Set(runtimeAxes.flatMap((axis) => code.runtime[axis]))];
  const codeText =
    variables.length > 0
      ? `${code.declaredText} (스토리 대표값 ${vectorText(code.value, conversion)})`
      : code.isConverted
        ? `${code.text} → ${vectorText(code.value, conversion)}`
        : code.text;
  if (differentValue.length > 0 || differentSign.length > 0) {
    const notes = [
      ...(differentValue.length > 0
        ? [`값이 다르다(허용 오차 ${String(conversion.tolerance)})`]
        : []),
      ...(differentSign.length > 0
        ? [
            `실행 중 값 ${[...new Set(differentSign.flatMap((axis) => code.runtime[axis]))].join(', ')}의 부호(방향)가 피그마와 다르다`,
          ]
        : []),
    ];
    return {
      ...base,
      figma: figmaText,
      code: codeText,
      status: 'different',
      note: notes.join('. '),
    };
  }
  return {
    ...base,
    figma: figmaText,
    code: codeText,
    status: variables.length > 0 ? 'runtime' : 'same',
    note: variables.length > 0 ? `실행 중 값 ${variables.join(', ')}: 변수와 부호만 본다` : '',
  };
}

/** 트랙과 짝지은 요소의 CSS 키프레임 */
type PairedEffect = {
  element: number;
  /** 요소의 CSS 애니메이션을 합친 키프레임(같은 속성은 뒤 애니메이션이 이긴다) */
  keyframes: CssKeyframe[];
  declarations: CssKeyframe[];
  box: ObservedEffect['box'];
  pathLength: number | null;
};

/**
 * 트랙과 짝지을 요소를 고른다.
 * @param track json 트랙
 * @param conversion 변환 규칙
 * @param effects CSS 애니메이션
 * @returns 짝지은 요소와 읽는 CSS 속성, 또는 찾지 못한 이유
 */
function pairEffects(
  track: ValueTrack,
  conversion: Conversion,
  effects: readonly ObservedEffect[],
): { ok: true; pair: PairedEffect; css: readonly string[] } | { ok: false; message: string } {
  const transformKind = transformKinds.get(track.property);
  const sources: (readonly string[])[] = [
    conversion.css,
    ...(transformKind === undefined ? [] : [[TRANSFORM_PROPERTY]]),
  ];
  for (const css of sources) {
    const candidates = effects.filter((effect) =>
      animatedProperties(effect).some((property) => css.includes(property)),
    );
    const elements = [...new Set(candidates.map((effect) => effect.element))];
    if (elements.length === 0) {
      continue;
    }
    /**
     * 요소의 `data-motion-node`를 구한다.
     * @param element 요소 번호
     * @returns 표시, 없으면 null
     */
    function nodeOf(element: number): string | null {
      return candidates.find((effect) => effect.element === element)?.node ?? null;
    }
    const marked = elements.filter((element) =>
      [track.node, track.path].includes(nodeOf(element) ?? ''),
    );
    const unmarked = elements.filter((element) => nodeOf(element) === null);
    const element =
      marked.length === 1 ? marked[0] : unmarked.length === 1 ? unmarked[0] : undefined;
    if (element === undefined) {
      return {
        ok: false,
        message: `${css.join(', ')}를 움직이는 요소가 여럿이라 짝을 정할 수 없다. 모션 스토리에서 이 트랙의 요소에 data-motion-node="${track.node}"를 단다`,
      };
    }
    return {
      ok: true,
      pair: mergeEffects(effects.filter((effect) => effect.element === element)),
      css,
    };
  }
  return {
    ok: false,
    message: `${conversion.css.join(', ')}를 움직이는 CSS 애니메이션이 모션 스토리에 없다`,
  };
}

/**
 * 한 요소의 CSS 애니메이션 키프레임을 위치별로 합친다. 같은 속성은 뒤 애니메이션(animation-name 목록의 뒤)이 이긴다.
 * @param effects 같은 요소의 CSS 애니메이션
 * @returns 합친 키프레임
 */
function mergeEffects(effects: readonly ObservedEffect[]): PairedEffect {
  const first = effects[0];
  /**
   * 키프레임 목록들을 위치별로 합친다.
   * @param lists 애니메이션마다의 키프레임
   * @returns 합친 키프레임
   */
  function merge(lists: readonly (readonly CssKeyframe[])[]): CssKeyframe[] {
    const merged: CssKeyframe[] = [];
    for (const list of lists) {
      for (const keyframe of list) {
        const existing = merged.find((item) => isSameOffset(item.offset, keyframe.offset));
        if (existing === undefined) {
          merged.push({ offset: keyframe.offset, values: { ...keyframe.values } });
        } else {
          existing.values = { ...existing.values, ...keyframe.values };
        }
      }
    }
    return merged.sort((a, b) => a.offset - b.offset);
  }
  return {
    element: first?.element ?? -1,
    keyframes: merge(effects.map((effect) => effect.keyframes)),
    declarations: merge(effects.map((effect) => effect.declarations)),
    box: first?.box ?? { width: 0, height: 0 },
    pathLength: first?.pathLength ?? null,
  };
}

/**
 * CSS 키프레임에서 피그마 단위의 값을 읽는다.
 * @param property 피그마 항목
 * @param conversion 변환 규칙
 * @param computed `getKeyframes()` 키프레임
 * @param declared `@keyframes` 선언(없을 수 있다)
 * @param pair 짝지은 요소
 * @param tokenVariables 토큰 CSS 변수 이름
 * @returns 코드 값, 또는 읽지 못한 이유
 */
function codeValue(
  property: string,
  conversion: Conversion,
  computed: CssKeyframe,
  declared: CssKeyframe | undefined,
  pair: PairedEffect,
  tokenVariables: ReadonlySet<string>,
): CodeValue | string {
  const own = conversion.css.find((css) => computed.values[css] !== undefined);
  const css =
    own ?? (computed.values[TRANSFORM_PROPERTY] === undefined ? undefined : TRANSFORM_PROPERTY);
  if (css === undefined) {
    return `이 키프레임에 ${conversion.css.join(', ')} 값이 없다`;
  }
  const text = cssText(computed, css === TRANSFORM_PROPERTY ? [css] : conversion.css);
  /**
   * `@keyframes`에 쓴 선언 그대로를 읽는다.
   * @param name CSS 속성
   * @returns 선언 값, 없으면 빈 글
   */
  function raw(name: string): string {
    return declared?.values[name] ?? '';
  }
  const value =
    css === TRANSFORM_PROPERTY
      ? transformValue(property, computed.values[css] ?? '', pair.box)
      : propertyValue(property, computed.values, pair);
  if (typeof value === 'string') {
    return value;
  }
  const runtime = runtimeVariables(property, conversion, raw, tokenVariables, css);
  const shown = css === TRANSFORM_PROPERTY ? [css] : conversion.css;
  const isConverted =
    css === TRANSFORM_PROPERTY ||
    property === 'ROTATION' ||
    property.startsWith('PATH_TRIM') ||
    text.includes('%');
  return { value, text, declaredText: cssText(declared, shown), isConverted, runtime };
}

/**
 * CSS 속성 값을 피그마 단위로 옮긴다.
 * @param property 피그마 항목
 * @param values 키프레임 값
 * @param pair 짝지은 요소
 * @returns 값, 또는 읽지 못한 이유
 */
function propertyValue(
  property: string,
  values: Readonly<Record<string, string>>,
  pair: PairedEffect,
): Vector | string {
  switch (property) {
    case 'OPACITY': {
      const value = parseNumber(values.opacity ?? '');
      return value === null
        ? `opacity ${values.opacity ?? ''}를 읽지 못했다`
        : { x: value, y: value };
    }
    case 'SCALE_XY':
    case 'SCALE_X':
    case 'SCALE_Y':
      return parseScale(values.scale ?? '') ?? `scale ${values.scale ?? ''}를 읽지 못했다`;
    case 'TRANSLATION_XY':
    case 'TRANSLATION_X':
    case 'TRANSLATION_Y':
      return (
        parseTranslate(values.translate ?? '', pair.box) ??
        `translate ${values.translate ?? ''}를 읽지 못했다`
      );
    case 'ROTATION': {
      // 피그마 회전은 반시계 방향이 +이고 CSS rotate는 시계 방향이 +라 부호를 뒤집는다.
      const angle = parseAngle(values.rotate ?? '');
      return angle === null
        ? `rotate ${values.rotate ?? ''}를 읽지 못했다`
        : { x: -angle, y: -angle };
    }
    case 'PATH_TRIM_START':
    case 'PATH_TRIM_END':
      return trimValue(property, values, pair.pathLength);
    default:
      return `${property}는 변환표에 없다`;
  }
}

/**
 * 경로 트림을 `stroke-dasharray`·`stroke-dashoffset`에서 읽는다. 자산은 `pathLength="1"`로 내보내
 * dasharray `<끝-시작> 1`, dashoffset `-<시작>`이다([[피그마 연동:모션]]).
 * @param property `PATH_TRIM_START` 또는 `PATH_TRIM_END`
 * @param values 키프레임 값
 * @param pathLength 경로 길이
 * @returns 0~1 비율, 또는 읽지 못한 이유
 */
function trimValue(
  property: string,
  values: Readonly<Record<string, string>>,
  pathLength: number | null,
): Vector | string {
  if (pathLength === null || pathLength <= 0) {
    return '경로 트림은 SVG 경로(pathLength)에서만 읽을 수 있다';
  }
  const offset = parseNumber(values['stroke-dashoffset'] ?? '0');
  if (offset === null) {
    return `stroke-dashoffset ${values['stroke-dashoffset'] ?? ''}를 읽지 못했다`;
  }
  const start = -offset / pathLength;
  if (property === 'PATH_TRIM_START') {
    return { x: start, y: start };
  }
  const dasharray = values['stroke-dasharray'] ?? '';
  const dash = dasharray === 'none' ? pathLength : parseNumber(dasharray.split(/[\s,]+/u)[0] ?? '');
  if (dash === null) {
    return `stroke-dasharray ${dasharray}를 읽지 못했다`;
  }
  const end = start + dash / pathLength;
  return { x: end, y: end };
}

/**
 * `transform` 함수 목록에서 이동·배율·회전을 읽는다. 함수가 그 종류 하나뿐일 때만 읽는다.
 * @param property 피그마 항목
 * @param text `transform` 값
 * @param box 요소 크기(% 이동)
 * @returns 값, 또는 읽지 못한 이유
 */
function transformValue(
  property: string,
  text: string,
  box: ObservedEffect['box'],
): Vector | string {
  const kind = transformKinds.get(property);
  const functions = [...text.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/gu)].map((match) => ({
    name: match[1] ?? '',
    args: (match[2] ?? '').split(',').map((part) => part.trim()),
  }));
  const own = functions.filter((item) => item.name.toLowerCase().startsWith(kind ?? '-'));
  if (text === 'none') {
    return kind === 'scale' ? { x: 1, y: 1 } : { x: 0, y: 0 };
  }
  const only = own[0];
  if (own.length !== 1 || only === undefined) {
    return `transform ${text}에서 ${kind ?? property} 함수 하나를 찾지 못했다`;
  }
  const name = only.name.toLowerCase();
  if (kind === 'rotate') {
    const angle = name === 'rotate' || name === 'rotatez' ? parseAngle(only.args[0] ?? '') : null;
    return angle === null ? `transform ${text}를 읽지 못했다` : { x: -angle, y: -angle };
  }
  // 빠진 성분은 기본값(배율 1, 이동 0)이다. scale(s) 하나는 두 성분 모두다.
  const fallback = kind === 'scale' ? '1' : '0';
  const first = only.args[0] ?? '';
  const second = only.args[1] ?? (kind === 'scale' ? first : fallback);
  const [x, y] = name.endsWith('x')
    ? [first, fallback]
    : name.endsWith('y')
      ? [fallback, first]
      : [first, second];
  const parsed = kind === 'scale' ? parseScale(`${x} ${y}`) : parseTranslate(`${x} ${y}`, box);
  return parsed ?? `transform ${text}를 읽지 못했다`;
}

/**
 * 키프레임 선언에서 성분마다 쓴 실행 중 값 변수(토큰이 아닌 CSS 변수)를 찾는다.
 * `translate`·`scale`은 공백으로 나눈 첫 값이 x, 둘째가 y다(`scale` 값 하나는 둘 다).
 * @param property 피그마 항목
 * @param conversion 변환 규칙
 * @param raw 선언 값을 읽는 함수
 * @param tokenVariables 토큰 CSS 변수 이름
 * @param css 값을 읽은 CSS 속성
 * @returns 성분마다의 변수
 */
function runtimeVariables(
  property: string,
  conversion: Conversion,
  raw: (name: string) => string,
  tokenVariables: ReadonlySet<string>,
  css: string,
): { x: string[]; y: string[] } {
  /**
   * 글에서 토큰이 아닌 CSS 변수를 찾는다.
   * @param text CSS 값
   * @returns 변수 이름
   */
  function runtimeIn(text: string): string[] {
    return variableNames(text).filter((name) => !tokenVariables.has(name));
  }
  if (
    css === TRANSFORM_PROPERTY ||
    (conversion.shape === 'number' && conversion.axis === undefined)
  ) {
    const declared = css === TRANSFORM_PROPERTY ? raw(css) : conversion.css.map(raw).join(' ');
    const names = runtimeIn(declared);
    return { x: names, y: names };
  }
  const parts = splitTopLevel(raw(css));
  const isScale = property.startsWith('SCALE');
  const x = parts[0] ?? '';
  const y = parts[1] ?? (isScale ? x : '');
  return { x: runtimeIn(x), y: runtimeIn(y) };
}

/**
 * 글에서 `var(--이름` 꼴로 쓴 CSS 변수 이름을 모은다.
 * @param text CSS 값
 * @returns 변수 이름
 */
export function variableNames(text: string): string[] {
  return [...text.matchAll(/var\(\s*(--[\w-]+)/gu)].map((match) => match[1] ?? '');
}

/**
 * CSS 값을 괄호 밖의 공백으로 나눈다.
 * @param text CSS 값
 * @returns 나눈 값
 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text.trim()) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }
    if (/\s/u.test(char) && depth === 0) {
      if (current !== '') {
        parts.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current !== '') {
    parts.push(current);
  }
  return parts;
}

/**
 * json 값을 변환 규칙의 꼴로 읽는다.
 * @param value json 키프레임 값
 * @param conversion 변환 규칙
 * @returns 값, 꼴이 다르면 null
 */
function figmaVector(value: unknown, conversion: Conversion): Vector | null {
  if (typeof value === 'number') {
    if (conversion.shape !== 'number') {
      return null;
    }
    return conversion.axis === 'y' ? { x: Number.NaN, y: value } : { x: value, y: value };
  }
  if (typeof value === 'object' && value !== null) {
    const x: unknown = Reflect.get(value, 'x');
    const y: unknown = Reflect.get(value, 'y');
    if (conversion.shape === 'xy' && typeof x === 'number' && typeof y === 'number') {
      return { x, y };
    }
  }
  return null;
}

/**
 * 비교하는 성분을 구한다.
 * @param conversion 변환 규칙
 * @returns 성분
 */
function axesOf(conversion: Conversion): ('x' | 'y')[] {
  if (conversion.shape === 'xy') {
    return ['x', 'y'];
  }
  return [conversion.axis ?? 'x'];
}

/**
 * `scale` 값을 읽는다.
 * @param text `1`, `0.6 0.7`, `none`
 * @returns x·y 배율, 읽지 못하면 null
 */
export function parseScale(text: string): Vector | null {
  if (text.trim() === 'none') {
    return { x: 1, y: 1 };
  }
  const parts = splitTopLevel(text).map((part) =>
    part.endsWith('%')
      ? (parseNumber(part.slice(0, -1)) ?? Number.NaN) / PERCENT
      : parseNumber(part),
  );
  const x = parts[0];
  const y = parts.length === 2 ? parts[1] : x;
  if (parts.length > 2 || x === null || x === undefined || y === null || y === undefined) {
    return null;
  }
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/**
 * `translate` 값을 px로 읽는다. %는 요소 크기로 바꾼다.
 * @param text `0px`, `-380px 294px`, `0px 100%`, `none`
 * @param box 요소 크기
 * @returns x·y 이동(px), 읽지 못하면 null
 */
export function parseTranslate(text: string, box: ObservedEffect['box']): Vector | null {
  if (text.trim() === 'none') {
    return { x: 0, y: 0 };
  }
  const parts = splitTopLevel(text);
  if (parts.length === 0 || parts.length > 3) {
    return null;
  }
  /**
   * 길이 하나를 px로 읽는다.
   * @param part `12px`, `100%`
   * @param size % 기준 크기
   * @returns px, 읽지 못하면 null
   */
  function length(part: string, size: number): number | null {
    return part.endsWith('%')
      ? ((parseNumber(part.slice(0, -1)) ?? Number.NaN) * size) / PERCENT
      : parseNumber(part);
  }
  const x = length(parts[0] ?? '0', box.width);
  const y = length(parts[1] ?? '0px', box.height);
  return x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y) ? null : { x, y };
}

/**
 * 각도를 deg로 읽는다.
 * @param text `450deg`, `0.5turn`, `none`
 * @returns deg, 읽지 못하면 null
 */
export function parseAngle(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === 'none') {
    return 0;
  }
  const match = /^(-?[\d.]+(?:e-?\d+)?)(deg|turn|rad|grad)?$/u.exec(trimmed);
  const amount = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  const unit = match?.[2] ?? 'deg';
  const perUnit: Record<string, number> = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 };
  return amount * (perUnit[unit] ?? Number.NaN);
}

/**
 * 숫자(px 단위 허용)를 읽는다.
 * @param text `0.5`, `-0.5px`
 * @returns 숫자, 읽지 못하면 null
 */
function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(/px$/u, '');
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * 부호를 구한다. 허용 오차 안은 0이다.
 * @param value 값
 * @param tolerance 허용 오차
 * @returns -1, 0, 1
 */
function signOf(value: number, tolerance: number): number {
  return Math.abs(value) <= tolerance ? 0 : Math.sign(value);
}

/**
 * 애니메이션이 움직이는 CSS 속성을 구한다.
 * @param effect CSS 애니메이션
 * @returns CSS 속성 이름
 */
function animatedProperties(effect: ObservedEffect): string[] {
  return [
    ...new Set(
      effect.keyframes.flatMap((keyframe) =>
        Object.keys(keyframe.values).filter((key) => !nonPropertyKeys.has(key)),
      ),
    ),
  ];
}

/**
 * CSS 속성이 값을 가진 코드 키프레임 위치를 구한다.
 * @param pair 짝지은 요소
 * @param css CSS 속성
 * @returns 위치
 */
function codeOffsets(pair: PairedEffect, css: readonly string[]): number[] {
  return pair.keyframes
    .filter((keyframe) => css.some((property) => keyframe.values[property] !== undefined))
    .map((keyframe) => keyframe.offset);
}

/**
 * 같은 위치의 키프레임을 찾는다.
 * @param keyframes 키프레임
 * @param offset 위치
 * @returns 키프레임
 */
function keyframeAt(keyframes: readonly CssKeyframe[], offset: number): CssKeyframe | undefined {
  return keyframes.find((keyframe) => isSameOffset(keyframe.offset, offset));
}

/**
 * 두 키프레임 위치가 같은지 본다.
 * @param left 위치
 * @param right 위치
 * @returns 같으면 true
 */
function isSameOffset(left: number, right: number): boolean {
  return Math.abs(left - right) <= OFFSET_TOLERANCE;
}

/**
 * 비교할 수 없는 트랙 한 줄을 만든다.
 * @param label 표에 쓰는 이름
 * @param note 이유
 * @returns 결과 표 줄
 */
function missingRow(label: string, note: string): ValueRow {
  return { keyframe: '-', property: label, figma: '', code: '', status: 'missing', note };
}

/**
 * 키프레임 위치를 표 글로 만든다.
 * @param offset 위치(0~1)
 * @param durationMs 트랙 길이
 * @returns `50% (1000ms)`
 */
function offsetText(offset: number, durationMs: number): string {
  return `${String(round(offset * PERCENT))}% (${String(round(offset * durationMs))}ms)`;
}

/**
 * 값을 표 글로 만든다.
 * @param value 값
 * @param conversion 변환 규칙
 * @returns `0.96`, `(-380, 294)px`
 */
function vectorText(value: Vector, conversion: Conversion): string {
  if (conversion.shape === 'xy') {
    return `(${String(round(value.x))}, ${String(round(value.y))})${conversion.unit}`;
  }
  return `${String(round(conversion.axis === 'y' ? value.y : value.x))}${conversion.unit}`;
}

/**
 * CSS 키프레임의 값을 표 글로 만든다.
 * @param keyframe CSS 키프레임
 * @param css 보일 CSS 속성
 * @returns `opacity: 0; scale: 0.96`
 */
function cssText(keyframe: CssKeyframe | undefined, css: readonly string[]): string {
  if (keyframe === undefined) {
    return '';
  }
  return css
    .filter((property) => keyframe.values[property] !== undefined)
    .map((property) => `${property}: ${keyframe.values[property] ?? ''}`)
    .join('; ');
}

/**
 * 표에 쓰는 자리수로 반올림한다.
 * @param value 값
 * @returns 소수 넷째 자리까지
 */
function round(value: number): number {
  const digits = 10_000;
  return Math.round(value * digits) / digits;
}

/**
 * 짝지은 요소·CSS 속성 열쇠를 만든다.
 * @param element 요소 번호
 * @param property CSS 속성
 * @returns 열쇠
 */
function claimKey(element: number, property: string): string {
  return `${String(element)}:${property}`;
}
