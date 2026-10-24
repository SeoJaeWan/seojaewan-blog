/**
 * 피그마 플러그인이 쓴 export.json의 변형 이름, 속성, PNG 안 노드 위치를 읽는다.
 * 이름 규칙은 플러그인과의 계약이며, 여기서는 그 규칙대로 쓰였는지 다시 확인만 한다.
 */

/** 대상(컴포넌트나 조립)의 변형 하나 */
export type VariantEntry = {
  /** 변형 파일 이름(확장자 제외), 예: `style=accent,state=rest` */
  variant: string;
  /** 피그마 변형 속성. 피그마 순서를 유지한다 */
  properties: [string, string][];
  /** 변형 PNG 안 노드 위치(배율 1의 px). 노드 위치가 없는 예전 내보내기는 null이다 */
  node: NodeBox | null;
};

/** 변형 PNG 안에서 노드가 놓인 자리(배율 1의 px) */
export type NodeBox = { x: number; y: number; width: number; height: number };

/** export.json을 읽은 결과 */
export type TargetManifest = {
  /** 피그마 이름(컴포넌트는 `Button`, 조립은 `Menu/Folder`) */
  name: string;
  variants: VariantEntry[];
};

// 단독 컴포넌트(변형 없음)의 파일 이름이다.
export const DEFAULT_VARIANT = 'default';

/**
 * export.json을 검증하고 변형 목록으로 바꾼다. 이름, 변형 이름, 변형 속성, PNG 안 노드 위치만 읽는다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @codocs [[피그마 연동:캡처 표]]
 * @param value export.json을 파싱한 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 이름과 변형 이름순 변형 목록
 */
export function parseManifest(value: unknown, where: string): TargetManifest {
  const entry = expectRecord(value, where);
  const name = expectString(entry.name, `${where}.name`);
  const variants: VariantEntry[] = [];
  for (const [variant, variantValue] of Object.entries(
    expectRecord(entry.variants, `${where}.variants`),
  )) {
    const variantWhere = `${where}.variants.${variant}`;
    const item = expectRecord(variantValue, variantWhere);
    const properties = inFileNameOrder(
      Object.entries(expectRecord(item.properties ?? {}, `${variantWhere}.properties`)).map(
        ([property, propertyValue]): [string, string] => [
          property,
          expectString(propertyValue, `${variantWhere}.properties.${property}`),
        ],
      ),
      variant,
    );
    const expectedName = variantFileName(properties);
    if (expectedName !== variant) {
      throw new Error(`${variantWhere}: 속성으로 만든 파일 이름은 "${expectedName}"이다.`);
    }
    const node = item.node === undefined ? null : parseNodeBox(item.node, `${variantWhere}.node`);
    variants.push({ variant, properties, node });
  }
  variants.sort((a, b) => a.variant.localeCompare(b.variant));
  return { name, variants };
}

/**
 * 변형 속성을 파일 이름으로 바꾼다. 속성이 없으면 `default`다.
 * @param properties 피그마 순서의 `[속성, 값]` 목록
 * @returns `style=accent,state=rest` 형태의 이름
 */
export function variantFileName(properties: readonly (readonly [string, string])[]): string {
  if (properties.length === 0) {
    return DEFAULT_VARIANT;
  }
  return properties
    .map(([name, value]) => `${normalizeName(name)}=${normalizeName(value)}`)
    .join(',');
}

/**
 * 이름을 소문자로 바꾸고 `[a-z0-9-]` 밖의 글자를 `-`로 바꾼다(연속은 하나로, 앞뒤는 지운다).
 * @param value 피그마 속성 이름이나 값
 * @returns 정규화한 이름
 */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
}

/**
 * 속성을 변형 파일 이름의 순서(피그마 순서)로 놓는다.
 * 플러그인은 JSON 키를 정렬해 쓰므로 properties의 순서는 피그마 순서가 아닐 수 있다.
 * 파일 이름에 없는 속성이 있으면 원래 순서를 그대로 돌려줘, 이후 파일 이름 비교가 실패하게 한다.
 * @param properties export.json의 `[속성, 값]` 목록
 * @param variant 변형 파일 이름
 * @returns 파일 이름 순서의 `[속성, 값]` 목록
 */
function inFileNameOrder(properties: [string, string][], variant: string): [string, string][] {
  const order = variant.split(',').map((part) => part.split('=')[0] ?? '');
  const ordered = order.flatMap((name) =>
    properties.filter(([property]) => normalizeName(property) === name),
  );
  return ordered.length === properties.length ? ordered : properties;
}

/**
 * PNG 안 노드 위치를 읽는다. 크기는 0보다 커야 한다.
 * @param value export.json의 node 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 노드 위치와 크기
 */
function parseNodeBox(value: unknown, where: string): NodeBox {
  const entry = expectRecord(value, where);
  const box = {
    x: expectNumber(entry.x, `${where}.x`),
    y: expectNumber(entry.y, `${where}.y`),
    width: expectNumber(entry.width, `${where}.width`),
    height: expectNumber(entry.height, `${where}.height`),
  };
  if (box.width <= 0 || box.height <= 0) {
    throw new Error(`${where}: 크기는 0보다 커야 한다.`);
  }
  return box;
}

/**
 * 유한한 숫자인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 숫자
 */
function expectNumber(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${where}: 숫자여야 한다.`);
  }
  return value;
}

/**
 * 객체인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 객체
 */
function expectRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: 객체여야 한다.`);
  }
  return Object.fromEntries(Object.entries(value));
}

/**
 * 문자열인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 문자열
 */
function expectString(value: unknown, where: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${where}: 문자열이어야 한다.`);
  }
  return value;
}
