import { type CatalogItem, TOKENS_KEY } from './target-catalog';

// 이름 붙여넣기 선택. 붙여넣은 글을 대상 이름으로 나누고 목록 항목과 짝짓는 순수 계산이다. DOM을 모른다.

/** 토큰을 가리키는 이름(소문자) */
const TOKEN_NAMES = ['토큰', 'tokens'] as const;
/** 줄 앞의 목록 표시(`-`, `*`, `+`, `1.`, `1)`) */
const LIST_MARKER = /^(?:[-*+]|\d+[.)])\s+/u;
/** 이름을 감싼 백틱 */
const BACKTICKS = /^`+|`+$/gu;
/** 영역 전체(`영역/*`) */
const AREA_WILDCARD = /^(.+?)\s*\/\s*\*$/u;

/** 붙여넣기 선택 결과 */
export type PasteMatch = {
  /** 고를 키(토큰은 TOKENS_KEY). 붙여넣은 순서이고 겹치지 않는다 */
  keys: string[];
  /** 찾지 못한 이름(붙여넣은 그대로) */
  notFound: string[];
};

/**
 * 붙여넣은 글을 이름 목록으로 나눈다. 한 줄에 하나, 또는 쉼표로 잇는다.
 * 빈 줄과 `#`으로 시작하는 줄은 버리고, 줄 앞의 `-`·`*`·번호, 이름을 감싼 백틱, 앞뒤 공백을 뗀다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param text 붙여넣은 글
 * @returns 이름(붙여넣은 순서)
 */
export function parsePasteText(text: string): string[] {
  const names: string[] = [];
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    for (const piece of line.replace(LIST_MARKER, '').split(',')) {
      const name = piece.trim().replace(BACKTICKS, '').trim();
      if (name !== '') {
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * 이름을 목록 항목과 짝짓는다. 대소문자를 구분하지 않는다.
 * `토큰`·`tokens`는 토큰, `영역/*`은 그 영역의 조립 전체, `영역/이름`은 조립, 나머지는 컴포넌트나 애니메이션 견본 이름이다.
 * `/` 앞뒤 공백은 무시한다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param names 붙여넣은 이름
 * @param items 목록 항목
 * @returns 고를 키와 찾지 못한 이름
 */
export function matchPasteNames(
  names: readonly string[],
  items: readonly CatalogItem[],
): PasteMatch {
  const keys: string[] = [];
  const notFound: string[] = [];
  /**
   * 키를 겹치지 않게 더한다.
   * @param key 선택 키
   */
  function pick(key: string): void {
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  for (const name of names) {
    const lower = normalize(name);
    if (TOKEN_NAMES.some((tokenName) => tokenName === lower)) {
      pick(TOKENS_KEY);
      continue;
    }
    const wildcard = AREA_WILDCARD.exec(lower);
    const found =
      wildcard === null
        ? items.filter((item) => normalize(item.name) === lower)
        : items.filter(
            (item) =>
              item.kind === 'pattern' &&
              normalize(item.name).startsWith(`${normalize(wildcard[1] ?? '')}/`),
          );
    if (found.length === 0) {
      notFound.push(name);
    }
    for (const item of found) {
      pick(item.key);
    }
  }
  return { keys, notFound };
}

/**
 * 비교용으로 소문자로 바꾸고 `/` 앞뒤 공백을 없앤다.
 * @param name 이름
 * @returns 비교용 이름
 */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/gu, '/');
}
