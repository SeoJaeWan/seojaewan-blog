/**
 * 피그마 플러그인이 쓴 figma/figma.json과 figma/components/<컴포넌트>/export.json을 읽어 비교할 변형 목록으로 바꾼다.
 * 이름 규칙은 플러그인과의 계약이며, 여기서는 그 규칙대로 쓰였는지 다시 확인만 한다.
 */

import type { FigmaLayer } from './figma-layers.ts';
import { parseLayers } from './figma-layers.ts';
import { COMPARED_MATERIAL, MATERIAL_PROPERTY } from './parity-config.ts';

export type RenderBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ParityCase = {
  /** 컴포넌트 폴더 이름(kebab-case) */
  component: string;
  /** 피그마 컴포넌트 이름(PascalCase) */
  componentName: string;
  /** 변형 파일 이름(확장자 제외), 예: `variant=accent,state=rest` */
  variant: string;
  /** 피그마 변형 속성. 피그마 순서를 유지한다 */
  properties: [string, string][];
  /** 피그마 노드 크기(CSS px) */
  width: number;
  height: number;
  /** 노드 왼쪽 위 기준으로 그림자까지 포함한 내보내기 영역 */
  renderBounds: RenderBounds;
  /** 내보낸 PNG의 배율. 브라우저 deviceScaleFactor로 쓴다 */
  scale: number;
  /** 변형 루트와 그 아래 레이어 정보. 첫 항목이 루트다. 읽지 못하면 빈 목록이고 layersError에 이유가 있다 */
  layers: FigmaLayer[];
  layersError?: string;
};

export type FigmaExport = {
  fileKey: string;
  scale: number;
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
  const scale = expectNumber(root.scale, 'figma.json scale');
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
      const bounds = expectRecord(item.renderBounds, `${variantWhere}.renderBounds`);
      cases.push({
        component,
        componentName,
        variant,
        properties,
        width: expectNumber(item.width, `${variantWhere}.width`),
        height: expectNumber(item.height, `${variantWhere}.height`),
        renderBounds: {
          x: expectNumber(bounds.x, `${variantWhere}.renderBounds.x`),
          y: expectNumber(bounds.y, `${variantWhere}.renderBounds.y`),
          width: expectNumber(bounds.width, `${variantWhere}.renderBounds.width`),
          height: expectNumber(bounds.height, `${variantWhere}.renderBounds.height`),
        },
        scale,
        ...readLayers(item.layers, `${component}/export.json layers`),
      });
    }
  }

  cases.sort((a, b) =>
    a.component === b.component
      ? a.variant.localeCompare(b.variant)
      : a.component.localeCompare(b.component),
  );
  return { fileKey: expectString(root.fileKey, 'figma.json fileKey'), scale, cases };
}

export type PixelClip = {
  /** 노드 왼쪽 위 기준 잘라낼 영역(CSS px) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 내보낸 PNG의 픽셀 크기 */
  pixelWidth: number;
  pixelHeight: number;
};

/**
 * renderBounds를 PNG와 같은 픽셀 영역으로 맞춘다.
 * 피그마는 소수인 렌더 영역을 픽셀 단위로 덮도록 내보낸다: 왼쪽 위는 내림, 오른쪽 아래는 올림.
 * @param bounds 노드 기준 renderBounds(CSS px)
 * @param scale 내보내기 배율
 * @returns 잘라낼 영역과 PNG 픽셀 크기
 */
export function pixelClip(bounds: RenderBounds, scale: number): PixelClip {
  const left = Math.floor(bounds.x * scale);
  const top = Math.floor(bounds.y * scale);
  const right = Math.ceil((bounds.x + bounds.width) * scale);
  const bottom = Math.ceil((bounds.y + bounds.height) * scale);
  return {
    x: left / scale,
    y: top / scale,
    width: (right - left) / scale,
    height: (bottom - top) / scale,
    pixelWidth: right - left,
    pixelHeight: bottom - top,
  };
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
 * 변형의 레이어 정보를 읽는다. 계약과 다르면 그 변형만 실패하도록 이유를 남긴다.
 * @param value layers 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 레이어 목록, 또는 빈 목록과 이유
 */
function readLayers(value: unknown, where: string): Pick<ParityCase, 'layers' | 'layersError'> {
  try {
    return { layers: parseLayers(value, where) };
  } catch (error) {
    return { layers: [], layersError: error instanceof Error ? error.message : String(error) };
  }
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

/**
 * 이미지 전체를 픽셀로 비교하는 변형인지 확인한다. 재질 속성이 있으면 효과를 뺀 단색 변형만 픽셀로 비교한다.
 * 피그마 배경 블러와 브라우저 backdrop-filter는 계산 방식이 달라 픽셀로 비교할 수 없기 때문이다.
 * 재질 변형도 값 비교(칠·이미지·블러·그림자 값)는 한다.
 * @codocs [[디자인 기반:재질 효과]]
 * @param parityCase 변형
 * @returns 픽셀로 비교하면 true
 */
export function isPixelComparedVariant(parityCase: Pick<ParityCase, 'properties'>): boolean {
  return parityCase.properties.every(
    ([name, value]) =>
      normalizeName(name) !== MATERIAL_PROPERTY || normalizeName(value) === COMPARED_MATERIAL,
  );
}
