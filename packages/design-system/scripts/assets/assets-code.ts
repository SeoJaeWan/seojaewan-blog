/**
 * 피그마 자산 파일(figma/assets/)을 코드가 쓰는 자산으로 바꾼다. 파일을 읽거나 쓰지 않는 순수 변환이다.
 * - SVG(Icons·Shapes·Illustrations 묶음): 요소와 속성을 담은 데이터 모듈(src/assets/asset-data.ts)
 * - 래스터(Images 묶음): src/assets/images/ 아래 같은 이름의 WebP(raster-code.ts가 설정을 정하고 asset-files.ts가 만든다)
 */

const GENERATED_HEADER = `// 이 파일은 scripts/assets/generate-assets.ts가 figma/assets/에서 만든다. 손으로 고치지 않는다.
// 다시 만들기: pnpm --filter @seojaewan/design-system generate:assets`;

// 입력은 피그마가 내보낸 정적 SVG이고 CI가 다시 만들어 바이트를 비교하므로, 요소와 속성은 표로 막지 않고 규칙으로 옮긴다.
// @codocs [[피그마 연동:자산]]
// 이름공간 속성의 React 이름. React가 SVG 이름과 다른 이름을 쓰는 속성이다(하이픈 규칙으로는 만들 수 없다).
const namespacedAttributeNames: Readonly<Record<string, string>> = {
  'xlink:href': 'xlinkHref',
  'xlink:title': 'xlinkTitle',
  'xlink:show': 'xlinkShow',
  'xlink:actuate': 'xlinkActuate',
  'xlink:arcrole': 'xlinkArcrole',
  'xlink:role': 'xlinkRole',
  'xlink:type': 'xlinkType',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace',
  'xml:base': 'xmlBase',
  class: 'className',
};

/**
 * SVG 속성 이름을 React 속성 이름으로 바꾼다. 하이픈 이름은 낙타 표기로(`stroke-dasharray` → `strokeDasharray`),
 * 하이픈 없는 이름은 그대로 둔다. `data-*`와 `aria-*`는 React도 하이픈 그대로 쓴다.
 * @param name SVG 속성 이름
 * @returns React 속성 이름. 옮길 수 없는 이름공간 속성이면 undefined
 */
function reactAttributeName(name: string): string | undefined {
  const namespaced = namespacedAttributeNames[name];
  if (namespaced !== undefined) {
    return namespaced;
  }
  if (name.includes(':')) {
    return undefined;
  }
  if (name.startsWith('data-') || name.startsWith('aria-')) {
    return name;
  }
  return name.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

/** SVG 요소 하나 */
export type SvgElementData = {
  tag: string;
  attributes: Record<string, string>;
  /** 자식 요소(defs, 그라데이션의 stop) */
  children?: SvgElementData[];
};

/** SVG 자산 하나 */
export type SvgAssetData = {
  viewBox: string;
  elements: SvgElementData[];
};

/**
 * 피그마가 내보낸 SVG를 요소 데이터로 바꾼다.
 * 루트 svg 아래 요소를 중첩 그대로 옮긴다. 글자 내용과 React에 그대로 넘길 수 없는 속성은 실패한다.
 * @codocs [[피그마 연동:자산]]
 * @param svg SVG 문서 문자열
 * @param file 오류 메시지에 쓸 자산 파일 경로
 * @returns viewBox와 요소 목록
 */
export function parseSvgAsset(svg: string, file: string): SvgAssetData {
  const root = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/u.exec(svg);
  if (root === null) {
    throw new Error(`${file}: svg 루트 요소를 찾을 수 없다.`);
  }
  const rootAttributes = parseAttributes(root[1] ?? '');
  const viewBox = rootAttributes.get('viewBox');
  if (viewBox === undefined) {
    throw new Error(`${file}: viewBox가 없다.`);
  }
  const tokens = (root[2] ?? '').matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>|([^<]+)/gu);
  const elements: SvgElementData[] = [];
  const stack: SvgElementData[] = [];
  for (const token of tokens) {
    const [, closing, tag = '', rawAttributes = '', selfClosing, textNode] = token;
    // 피그마는 글자를 윤곽선으로 내보내므로 글자 내용이 나오면 내보내기가 잘못된 것이다.
    if (textNode !== undefined) {
      if (textNode.trim() !== '') {
        throw new Error(`${file}: 글자 내용은 옮기지 않는다(${textNode.trim().slice(0, 40)}).`);
      }
      continue;
    }
    if (closing === '/') {
      if (stack.pop()?.tag !== tag) {
        throw new Error(`${file}: </${tag}>의 짝이 맞지 않는다.`);
      }
      continue;
    }
    const element = parseElement(tag, rawAttributes, file);
    const parent = stack.at(-1);
    if (parent === undefined) {
      elements.push(element);
    } else {
      parent.children = [...(parent.children ?? []), element];
    }
    if (selfClosing !== '/') {
      stack.push(element);
    }
  }
  if (stack.length > 0) {
    throw new Error(`${file}: <${stack.at(-1)?.tag ?? ''}>가 닫히지 않았다.`);
  }
  return { viewBox, elements };
}

/**
 * SVG 요소 하나의 태그와 속성을 옮긴다. 태그는 그대로 두고 속성 이름만 React 이름으로 바꾼다.
 * @param tag 태그 이름
 * @param rawAttributes 속성 문자열
 * @param file 오류 메시지에 쓸 자산 파일 경로
 * @returns 요소 데이터(자식 없음)
 */
function parseElement(tag: string, rawAttributes: string, file: string): SvgElementData {
  const attributes: Record<string, string> = {};
  for (const [name, value] of parseAttributes(rawAttributes)) {
    // React는 style을 객체로만 받아 문자열을 그대로 넘기면 깨진다.
    if (name === 'style') {
      throw new Error(
        `${file}: <${tag}>의 style 속성은 옮길 수 없다. React가 문자열 style을 받지 않는다(${value.slice(0, 40)}).`,
      );
    }
    const reactName = reactAttributeName(name);
    if (reactName === undefined) {
      throw new Error(
        `${file}: <${tag}>의 ${name} 속성은 옮길 수 없다. 이름공간 속성은 namespacedAttributeNames에 더한다.`,
      );
    }
    attributes[reactName] = value;
  }
  return { tag, attributes };
}

/**
 * 자산 데이터 모듈(src/assets/asset-data.ts)의 내용을 만든다.
 * @codocs [[피그마 연동:자산]]
 * @param assets 자산 파일 경로(`icons/ic_fluent_add_20_regular.svg`) → SVG 데이터
 * @returns TypeScript 모듈 문자열
 */
export function assetDataModule(assets: ReadonlyMap<string, SvgAssetData>): string {
  const entries = [...assets]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([file, data]) => assetEntry(file, data))
    .join('\n');
  return `${GENERATED_HEADER}

/** SVG 요소(그라데이션은 자식 요소를 가진다) */
export type SvgAssetElement = {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children?: readonly SvgAssetElement[];
};

/** 피그마 자산 파일 경로(figma/assets/ 기준) → SVG 요소 */
export const svgAssets = {
${entries}
} as const satisfies Record<
  string,
  { viewBox: string; elements: readonly SvgAssetElement[] }
>;

/** SVG 자산 이름 */
export type SvgAssetName = keyof typeof svgAssets;
`;
}

/**
 * 자산 데이터 모듈의 항목 하나를 쓴다.
 * @param file 자산 파일 경로
 * @param data SVG 데이터
 * @returns 객체 리터럴 항목
 */
function assetEntry(file: string, data: SvgAssetData): string {
  const elements = data.elements.map((element) => `      ${elementLiteral(element)},`).join('\n');
  return `  '${file}': {\n    viewBox: '${data.viewBox}',\n    elements: [\n${elements}\n    ],\n  },`;
}

/**
 * SVG 요소 하나(자식 포함)를 객체 리터럴로 쓴다.
 * @param element 요소
 * @returns `{ tag: 'path', attributes: { ... } }`
 */
function elementLiteral(element: SvgElementData): string {
  const children =
    element.children === undefined
      ? ''
      : `, children: [${element.children.map((child) => elementLiteral(child)).join(', ')}]`;
  return `{ tag: '${element.tag}', attributes: ${objectLiteral(element.attributes)}${children} }`;
}

/**
 * 속성 문자열을 이름 → 값 표로 바꾼다.
 * @param text `a="1" b="2"` 형태의 문자열
 * @returns 속성 표
 */
function parseAttributes(text: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of text.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*)"/gu)) {
    const [, name = '', value = ''] = match;
    if (name !== 'xmlns' && !name.startsWith('xmlns:')) {
      attributes.set(name, value);
    }
  }
  return attributes;
}

/**
 * 문자열 표를 TypeScript 객체 리터럴로 쓴다.
 * @param record 이름 → 값
 * @returns `{ d: '...', fill: 'currentColor' }`
 */
function objectLiteral(record: Readonly<Record<string, string>>): string {
  const body = Object.entries(record)
    .map(([name, value]) => `${name}: '${value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`)
    .join(', ');
  return `{ ${body} }`;
}
