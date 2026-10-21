/**
 * 피그마 플러그인이 쓴 figma/figma.json과 figma/components/<컴포넌트>/export.json을 읽어 비교할 변형 목록으로 바꾼다.
 * 이름 규칙은 플러그인과의 계약이며, 여기서는 그 규칙대로 쓰였는지 다시 확인만 한다.
 */

export type ParityCase = {
  /** 컴포넌트 폴더 이름(kebab-case) */
  component: string;
  /** 피그마 컴포넌트 이름(PascalCase) */
  componentName: string;
  /** 변형 파일 이름(확장자 제외), 예: `variant=accent,state=rest` */
  variant: string;
  /** 피그마 변형 속성. 피그마 순서를 유지한다 */
  properties: [string, string][];
};

export type FigmaExport = {
  fileKey: string;
  cases: ParityCase[];
};

// 단독 컴포넌트(변형 없음)의 파일 이름이다.
export const DEFAULT_VARIANT = 'default';

/**
 * figma.json과 컴포넌트별 export.json을 검증하고 비교할 변형 목록으로 바꾼다.
 * @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
 * @param settings figma.json을 파싱한 값
 * @param components 컴포넌트 폴더 이름 → 그 폴더의 export.json을 파싱한 값
 * @returns 컴포넌트·변형 순서대로 정렬한 비교 목록
 */
export function parseFigmaExport(
  settings: unknown,
  components: Readonly<Record<string, unknown>>,
): FigmaExport {
  const root = expectRecord(settings, 'figma.json');
  const cases: ParityCase[] = [];

  for (const [component, value] of Object.entries(components)) {
    const where = `components/${component}/export.json`;
    const entry = expectRecord(value, where);
    const componentName = expectString(entry.name, `${where}.name`);

    const variants = expectRecord(entry.variants, `${where} variants`);
    for (const [variant, variantValue] of Object.entries(variants)) {
      const variantWhere = `${where}.variants.${variant}`;
      const item = expectRecord(variantValue, variantWhere);
      const properties = inFileNameOrder(
        Object.entries(expectRecord(item.properties ?? {}, `${variantWhere}.properties`)).map(
          ([name, propertyValue]): [string, string] => [
            name,
            expectString(propertyValue, `${variantWhere}.properties.${name}`),
          ],
        ),
        variant,
      );
      const expectedName = variantFileName(properties);
      if (expectedName !== variant) {
        throw new Error(`${variantWhere}: 속성으로 만든 파일 이름은 "${expectedName}"이다.`);
      }
      cases.push({ component, componentName, variant, properties });
    }
  }

  cases.sort((a, b) =>
    a.component === b.component
      ? a.variant.localeCompare(b.variant)
      : a.component.localeCompare(b.component),
  );
  return { fileKey: expectString(root.fileKey, 'figma.json fileKey'), cases };
}

/**
 * 변형 속성을 파일 이름으로 바꾼다. 속성이 없으면 `default`다.
 * @param properties 피그마 순서의 `[속성, 값]` 목록
 * @returns `variant=accent,state=rest` 형태의 이름
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
