/**
 * 피그마 자산 파일(figma/assets/)을 코드가 쓰는 자산으로 바꾼다. 파일을 읽거나 쓰지 않는 순수 변환이다.
 * - SVG(Icons·Shapes·Illustrations 묶음): 요소와 속성을 담은 데이터 모듈(src/assets/asset-data.ts)
 * - PNG(Images 묶음): src/assets/images/ 아래 같은 이름으로 복사(generate-assets.ts가 맡는다)
 */

const GENERATED_HEADER = `// 이 파일은 scripts/assets/generate-assets.ts가 figma/assets/에서 만든다. 손으로 고치지 않는다.
// 다시 만들기: pnpm --filter @seojaewan/design-system generate:assets`;

// SVG 요소 중 코드로 옮기는 것. 피그마가 내보낸 아이콘은 path만 쓴다. 다른 요소가 나오면 실패시켜 이 표를 넓힌다.
const supportedElements = new Set(['path', 'rect', 'circle', 'ellipse']);

// SVG 속성 이름 → React 속성 이름. 표에 없는 하이픈 속성은 실패시킨다.
const attributeNames: Readonly<Record<string, string>> = {
  d: 'd',
  x: 'x',
  y: 'y',
  width: 'width',
  height: 'height',
  rx: 'rx',
  ry: 'ry',
  cx: 'cx',
  cy: 'cy',
  r: 'r',
  fill: 'fill',
  stroke: 'stroke',
  opacity: 'opacity',
  transform: 'transform',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'fill-opacity': 'fillOpacity',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-opacity': 'strokeOpacity',
};

/** SVG 요소 하나 */
/**
 * 이미지 칠 층이 쓰는 코드 자산 파일 이름을 정한다. 불투명도가 1보다 작으면 자산 생성기가 그 불투명도를
 * 미리 넣은 이미지를 따로 만든다(CSS 배경 층에는 층마다 불투명도를 줄 수 없다).
 * @codocs [[피그마 일치 검사:자산]]
 * @param asset 자산 파일(`images/noise-acrylic.png`)
 * @param opacity 층 불투명도
 * @returns 코드 자산 파일(`images/noise-acrylic.opacity-2.png`)
 */
export function imageLayerFile(asset: string, opacity: number): string {
  if (opacity >= 1) {
    return asset;
  }
  const percent = String(Number((opacity * 100).toFixed(2)));
  return asset.replace(/\.png$/u, `.opacity-${percent}.png`);
}

export type SvgElementData = {
  tag: string;
  attributes: Record<string, string>;
};

/** SVG 자산 하나 */
export type SvgAssetData = {
  viewBox: string;
  elements: SvgElementData[];
};

/**
 * 피그마가 내보낸 SVG를 요소 데이터로 바꾼다.
 * 루트 svg 아래 지원하는 요소만 한 단계로 있어야 한다. 그 밖의 구조는 코드로 옮길 수 없어 실패한다.
 * @codocs [[피그마 일치 검사:자산]]
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
  const elements: SvgElementData[] = [];
  let rest = (root[2] ?? '').trim();
  while (rest !== '') {
    const element = /^<([a-zA-Z]+)\b([^>]*?)\/>\s*/u.exec(rest);
    if (element === null) {
      throw new Error(`${file}: 닫는 태그가 없는 단일 요소만 옮길 수 있다(${rest.slice(0, 40)}).`);
    }
    const tag = element[1] ?? '';
    if (!supportedElements.has(tag)) {
      throw new Error(`${file}: <${tag}> 요소는 옮기지 않는다.`);
    }
    const attributes: Record<string, string> = {};
    for (const [name, value] of parseAttributes(element[2] ?? '')) {
      const reactName = attributeNames[name];
      if (reactName === undefined) {
        throw new Error(`${file}: <${tag}>의 ${name} 속성은 옮기지 않는다.`);
      }
      attributes[reactName] = value;
    }
    elements.push({ tag, attributes });
    rest = rest.slice(element[0].length);
  }
  return { viewBox, elements };
}

/**
 * 자산 데이터 모듈(src/assets/asset-data.ts)의 내용을 만든다.
 * @codocs [[피그마 일치 검사:자산]]
 * @param assets 자산 파일 경로(`icons/ic_fluent_add_20_regular.svg`) → SVG 데이터
 * @returns TypeScript 모듈 문자열
 */
export function assetDataModule(assets: ReadonlyMap<string, SvgAssetData>): string {
  const entries = [...assets]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([file, data]) => assetEntry(file, data))
    .join('\n');
  return `${GENERATED_HEADER}

/** 피그마 자산 파일 경로(figma/assets/ 기준) → SVG 요소 */
export const svgAssets = {
${entries}
} as const satisfies Record<
  string,
  { viewBox: string; elements: readonly { tag: string; attributes: Readonly<Record<string, string>> }[] }
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
  const elements = data.elements
    .map(
      (element) =>
        `      { tag: '${element.tag}', attributes: ${objectLiteral(element.attributes)} },`,
    )
    .join('\n');
  return `  '${file}': {\n    viewBox: '${data.viewBox}',\n    elements: [\n${elements}\n    ],\n  },`;
}

/**
 * 속성 문자열을 이름 → 값 표로 바꾼다.
 * @param text `a="1" b="2"` 형태의 문자열
 * @returns 속성 표
 */
function parseAttributes(text: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of text.matchAll(/([a-zA-Z:-]+)="([^"]*)"/gu)) {
    const [, name = '', value = ''] = match;
    if (name !== 'xmlns') {
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
