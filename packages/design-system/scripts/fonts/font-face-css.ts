/**
 * Pretendard 패키지의 `@font-face` CSS에서 woff2 파일만 가리키는 `@font-face` 규칙을 만든다.
 * 파일을 읽거나 쓰지 않는 순수 변환이다. 파일 입출력은 generate-fonts.ts가 맡는다.
 */

// 패키지 CSS의 woff2 하위 집합 폴더 이름이다. 이 폴더의 파일만 남긴다.
const WOFF2_DIR = 'woff2-dynamic-subset';

const GENERATED_HEADER = `/*
 * 이 파일은 scripts/fonts/generate-fonts.ts가 pretendard 패키지의 CSS에서 만든다. 손으로 고치지 않는다.
 * 다시 만들기: pnpm --filter @seojaewan/design-system generate:fonts
 */`;

export type FontFace = {
  family: string;
  weight: string;
  style: string;
  display: string;
  /** woff2 파일 이름 */
  file: string;
  unicodeRange: string;
};

export class FontCssError extends Error {
  override name = 'FontCssError';
}

/**
 * 패키지 CSS에서 `@font-face` 규칙을 읽고 woff2 파일 하나만 남긴다.
 * @param css pretendard 패키지의 `Pretendard-<굵기>.css` 내용
 * @returns 글자 범위(unicode-range)마다 하나씩인 `@font-face` 목록
 */
export function parseFontFaces(css: string): FontFace[] {
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map((match) => match[1] ?? '');
  if (blocks.length === 0) {
    throw new FontCssError('@font-face 규칙이 없다.');
  }
  return blocks.map(parseFontFace);
}

/**
 * `@font-face` 블록 하나를 읽는다.
 * @param block 중괄호 안의 선언
 * @returns woff2 파일 하나만 남긴 규칙
 */
function parseFontFace(block: string): FontFace {
  const declarations = new Map(
    block
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(splitDeclaration),
  );
  const src = declarations.get('src') ?? '';
  const file = new RegExp(String.raw`url\(\./${WOFF2_DIR}/([^)]+\.woff2)\)`, 'u').exec(src)?.[1];
  if (file === undefined) {
    throw new FontCssError(`woff2 파일이 없는 @font-face다: ${src}`);
  }
  return {
    family: required(declarations, 'font-family'),
    weight: required(declarations, 'font-weight'),
    style: required(declarations, 'font-style'),
    display: required(declarations, 'font-display'),
    file,
    unicodeRange: required(declarations, 'unicode-range'),
  };
}

/**
 * `이름: 값` 선언을 나눈다.
 * @param line 선언 한 줄
 * @returns 속성 이름과 값
 */
function splitDeclaration(line: string): [string, string] {
  const colon = line.indexOf(':');
  return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}

/**
 * woff2만 가리키는 `@font-face` CSS를 만든다.
 * @codocs [[디자인 기반:서체]]
 * @param faces parseFontFaces로 읽은 규칙
 * @param fileDir woff2 파일이 있는 폴더(이 CSS 파일 기준 상대 경로)
 * @returns 생성 파일 내용
 */
export function fontFacesToCss(faces: readonly FontFace[], fileDir: string): string {
  const rules = faces.map((face) => fontFaceRule(face, fileDir));
  return `${GENERATED_HEADER}\n\n${rules.join('\n\n')}\n`;
}

/**
 * `@font-face` 규칙 하나를 쓴다.
 * @param face 규칙
 * @param fileDir woff2 파일 폴더
 * @returns CSS 규칙
 */
function fontFaceRule(face: FontFace, fileDir: string): string {
  return `@font-face {
  font-family: ${face.family};
  font-style: ${face.style};
  font-display: ${face.display};
  font-weight: ${face.weight};
  src: url(${fileDir}/${face.file}) format('woff2');
  unicode-range: ${face.unicodeRange};
}`;
}

/**
 * 선언 값을 꺼낸다. 없으면 실패한다.
 * @param declarations `@font-face` 선언
 * @param name 속성 이름
 * @returns 속성 값
 */
function required(declarations: ReadonlyMap<string, string>, name: string): string {
  const value = declarations.get(name);
  if (value === undefined) {
    throw new FontCssError(`@font-face에 ${name}이 없다.`);
  }
  return value;
}
