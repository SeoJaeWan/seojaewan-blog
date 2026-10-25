// 경로 트림(PATH_TRIM_START·PATH_TRIM_END)이 걸린 벡터를 SVG에서 `pathLength="1"`과 `stroke-dasharray`로 나타낸다.
// 피그마는 실행 환경에 따라 트림을 경로에 구워(잘린 조각만) 내보내기도 해서, 피그마에 저장된 벡터 경로와
// 트림 기본값으로 이 꼴을 직접 만든다. 피그마 API를 모르는 순수 함수다.

/** 피그마 `Transform` 꼴의 2×3 아핀 변환 `[[a, b, tx], [c, d, ty]]` */
export type AffineTransform = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
];

/** 경로 트림이 걸린 레이어 하나 */
export type TrimmedVector = {
  /** 레이어 이름(메시지에 쓴다) */
  name: string;
  /** 벡터의 `vectorPaths` 경로 데이터. 벡터가 아니면 null */
  paths: readonly string[] | null;
  /** 벡터 좌표 → 자산 컴포넌트 좌표 */
  transform: AffineTransform;
  /** PATH_TRIM_START 기본값(트랙이 없으면 0). 숫자로 읽지 못하면 null */
  start: number | null;
  /** PATH_TRIM_END 기본값(트랙이 없으면 1). 숫자로 읽지 못하면 null */
  end: number | null;
};

/** 숫자 표기 유효 자릿수. 피그마 SVG 내보내기와 같다 */
const SIGNIFICANT_DIGITS = 6;
/** 경로 명령마다 받는 숫자 개수(피그마 `vectorPaths`는 절대 좌표 M·L·Q·C·Z만 쓴다) */
const commandArity: Readonly<Record<string, number>> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
/** 새로 만드는 요소에서 앞에 둘 속성 순서(피그마 SVG 순서). 나머지는 원래 순서로 뒤에 둔다 */
const ATTRIBUTE_ORDER = [
  'fill',
  'fill-rule',
  'clip-rule',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
] as const;
/** 새로 정하는 속성. 원래 요소에 있어도 버린다 */
const replacedAttributes = new Set(['d', 'pathLength', 'stroke-dasharray', 'stroke-dashoffset']);

/**
 * 트림이 걸린 벡터의 SVG 요소를 벡터 경로 전체와 트림 기본값으로 다시 만든다.
 * 요소는 `d`(벡터 경로를 자산 좌표로 옮긴 것), `pathLength="1"`, 원래 요소의 나머지 속성(선 색·두께·끝 모양 등),
 * `stroke-dasharray="<끝-시작> 1"`, 시작이 0이 아니면 `stroke-dashoffset="-<시작>"` 순서다.
 * 트림 벡터와 SVG 요소의 짝을 확실히 정할 수 없으면(트림 벡터나 선 요소가 하나가 아님 등) 이유와 함께 실패한다.
 * @codocs [[피그마 연동:자산]]
 * @codocs [[피그마 연동:모션]]
 * @param svg 피그마가 내보낸 SVG
 * @param asset 자산 이름(메시지에 쓴다)
 * @param vectors 자산 안에서 트림이 걸린 레이어
 * @returns 바꾼 SVG. 트림 레이어가 없으면 그대로
 */
export function trimmedPathSvg(
  svg: string,
  asset: string,
  vectors: readonly TrimmedVector[],
): string {
  if (vectors.length === 0) {
    return svg;
  }
  const [vector] = vectors;
  if (vector === undefined || vectors.length > 1) {
    throw assetError(
      asset,
      `경로 트림이 걸린 레이어가 여럿(${vectors.map((item) => item.name).join(', ')})이라 SVG 요소와 짝을 정할 수 없다`,
      '경로 트림은 자산 하나에 벡터 하나에만 건다',
    );
  }
  if (vector.paths === null) {
    throw assetError(
      asset,
      `경로 트림이 걸린 레이어 ${vector.name}가 벡터가 아니라 경로를 읽을 수 없다`,
      '트림을 거는 레이어를 벡터(열린 경로)로 그린다',
    );
  }
  const [path] = vector.paths;
  if (path === undefined || vector.paths.length > 1) {
    throw assetError(
      asset,
      `벡터 ${vector.name}의 경로가 ${String(vector.paths.length)}개라 SVG 요소와 짝을 정할 수 없다`,
      '경로 하나짜리 벡터로 그린다',
    );
  }
  const { start, end } = vector;
  if (start === null || end === null || !(start >= 0 && start <= end && end <= 1)) {
    throw assetError(
      asset,
      `벡터 ${vector.name}의 트림 기본값(시작 ${String(start)}, 끝 ${String(end)})이 0 ≤ 시작 ≤ 끝 ≤ 1이 아니다`,
      'PATH_TRIM_START·PATH_TRIM_END 키프레임 기본값을 0~1 숫자로, 시작이 끝보다 크지 않게 둔다',
    );
  }
  const elements = [...svg.matchAll(/<path\b[^>]*>/gu)].filter((match) =>
    hasStroke(attributesOf(match[0])),
  );
  const [element] = elements;
  if (element === undefined || elements.length > 1) {
    throw assetError(
      asset,
      `SVG에 선이 있는 path 요소가 ${String(elements.length)}개라 트림 벡터 ${vector.name}와 짝을 정할 수 없다`,
      '트림 벡터 말고는 선이 없게 그리거나 트림 벡터를 따로 자산으로 나눈다',
    );
  }
  const tag = element[0];
  const attributes = attributesOf(tag);
  if (!tag.endsWith('/>') || attributes.has('transform')) {
    throw assetError(
      asset,
      `트림 벡터 ${vector.name}의 SVG 요소가 자식이나 transform을 가져 경로를 옮길 수 없다`,
      '벡터를 회전·기울이지 않은 단순한 경로로 그린다',
    );
  }
  const rebuilt: [string, string][] = [
    ['d', transformPathData(path, vector.transform)],
    ['pathLength', '1'],
    ...orderedAttributes(attributes),
    ['stroke-dasharray', `${svgNumber(end - start)} 1`],
  ];
  if (start !== 0) {
    rebuilt.push(['stroke-dashoffset', svgNumber(-start)]);
  }
  const next = `<path ${rebuilt.map(([name, value]) => `${name}="${value}"`).join(' ')}/>`;
  const index = element.index;
  return `${svg.slice(0, index)}${next}${svg.slice(index + tag.length)}`;
}

/**
 * 자식 노드의 변환을 부모 노드 좌표로 옮긴다. 두 노드의 `absoluteTransform`으로 부모⁻¹ × 자식을 구한다.
 * 그룹 안 노드도 같은 식으로 구할 수 있고, 피그마 SVG 내보내기와 같은 좌표가 나온다.
 * @codocs [[피그마 연동:자산]]
 * @param parent 부모(자산 컴포넌트)의 절대 변환
 * @param child 자식(벡터)의 절대 변환
 * @returns 자식 좌표 → 부모 좌표 변환
 */
export function relativeTransform(
  parent: AffineTransform,
  child: AffineTransform,
): AffineTransform {
  const [[a, b, tx], [c, d, ty]] = parent;
  const determinant = a * d - b * c;
  if (determinant === 0) {
    throw new Error('자산 컴포넌트의 변환을 되돌릴 수 없다(크기가 0).');
  }
  const inverse: AffineTransform = [
    [d / determinant, -b / determinant, (b * ty - d * tx) / determinant],
    [-c / determinant, a / determinant, (c * tx - a * ty) / determinant],
  ];
  return multiply(inverse, child);
}

/**
 * 피그마 경로 데이터(`M 1 2 C …`)의 좌표를 변환하고 피그마 SVG 표기(`M1 2C…`)로 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @param data 경로 데이터(절대 좌표 M·L·Q·C·Z)
 * @param transform 좌표 변환
 * @returns SVG `d` 값
 */
export function transformPathData(data: string, transform: AffineTransform): string {
  const tokens = data.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/gu) ?? [];
  let result = '';
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index] ?? '';
    const arity = commandArity[command];
    if (arity === undefined) {
      throw new Error(`경로 명령 "${command}"는 옮길 수 없다(절대 좌표 M·L·Q·C·Z만 옮긴다).`);
    }
    index += 1;
    const numbers: number[] = [];
    while (index < tokens.length && !/^[A-Za-z]$/u.test(tokens[index] ?? '')) {
      numbers.push(Number(tokens[index]));
      index += 1;
    }
    if (arity === 0 ? numbers.length > 0 : numbers.length === 0 || numbers.length % arity !== 0) {
      throw new Error(`경로 명령 ${command}의 숫자 개수(${String(numbers.length)})가 맞지 않다.`);
    }
    const points: string[] = [];
    for (let at = 0; at < numbers.length; at += 2) {
      const [x, y] = applyTransform(transform, numbers[at] ?? 0, numbers[at + 1] ?? 0);
      points.push(svgNumber(x), svgNumber(y));
    }
    result += `${command}${points.join(' ')}`;
  }
  return result;
}

/**
 * 숫자를 피그마 SVG 내보내기와 같은 유효 6자리로 쓴다. 같은 값이면 늘 같은 글자가 나온다.
 * @codocs [[피그마 연동:자산]]
 * @param value 숫자
 * @returns 표기(끝의 0과 -0은 없앤다)
 */
export function svgNumber(value: number): string {
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS));
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * 자산 내보내기 실패 오류를 만든다. 디자이너가 메시지만 보고 고칠 수 있게 이유와 고칠 방법을 함께 쓴다.
 * @param asset 자산 이름
 * @param reason 이유
 * @param fix 고칠 방법
 * @returns 오류
 */
function assetError(asset: string, reason: string, fix: string): Error {
  return new Error(`자산 ${asset}: ${reason}. ${fix}`);
}

/**
 * 속성의 정렬 순위를 구한다. 정한 순서에 없는 속성은 모두 맨 뒤 순위다.
 * @param name 속성 이름
 * @returns 순위
 */
function attributeRank(name: string): number {
  const at = (ATTRIBUTE_ORDER as readonly string[]).indexOf(name);
  return at === -1 ? ATTRIBUTE_ORDER.length : at;
}

/**
 * 두 아핀 변환을 곱한다(오른쪽을 먼저 적용).
 * @param left 나중에 적용할 변환
 * @param right 먼저 적용할 변환
 * @returns 곱
 */
function multiply(left: AffineTransform, right: AffineTransform): AffineTransform {
  const [[a1, b1, x1], [c1, d1, y1]] = left;
  const [[a2, b2, x2], [c2, d2, y2]] = right;
  return [
    [a1 * a2 + b1 * c2, a1 * b2 + b1 * d2, a1 * x2 + b1 * y2 + x1],
    [c1 * a2 + d1 * c2, c1 * b2 + d1 * d2, c1 * x2 + d1 * y2 + y1],
  ];
}

/**
 * 점 하나를 변환한다.
 * @param transform 변환
 * @param x x 좌표
 * @param y y 좌표
 * @returns 변환한 좌표
 */
function applyTransform(transform: AffineTransform, x: number, y: number): [number, number] {
  const [[a, b, tx], [c, d, ty]] = transform;
  return [a * x + b * y + tx, c * x + d * y + ty];
}

/**
 * 요소 태그의 속성을 순서대로 읽는다.
 * @param tag 요소 시작 태그
 * @returns 속성 이름 → 값(문서 순서)
 */
function attributesOf(tag: string): Map<string, string> {
  return new Map(
    [...tag.matchAll(/\s([A-Za-z:-]+)="([^"]*)"/gu)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
}

/**
 * 선을 그리는 요소인지 본다.
 * @param attributes 요소 속성
 * @returns `stroke`가 있고 `none`이 아니면 true
 */
function hasStroke(attributes: ReadonlyMap<string, string>): boolean {
  const stroke = attributes.get('stroke');
  return stroke !== undefined && stroke !== 'none';
}

/**
 * 새로 정하는 속성을 빼고, 정한 순서의 속성을 앞에, 나머지를 원래 순서로 뒤에 둔다.
 * 실행 환경마다 속성 순서가 달라도 같은 바이트가 나오게 하기 위해서다.
 * @param attributes 원래 요소 속성
 * @returns `[이름, 값]` 목록
 */
function orderedAttributes(attributes: ReadonlyMap<string, string>): [string, string][] {
  const kept = [...attributes].filter(([name]) => !replacedAttributes.has(name));
  return kept
    .map((entry, at) => ({ entry, at }))
    .sort(
      (left, right) =>
        attributeRank(left.entry[0]) - attributeRank(right.entry[0]) || left.at - right.at,
    )
    .map(({ entry }) => entry);
}
