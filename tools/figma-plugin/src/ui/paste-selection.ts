import { ASSETS_KEY, type CatalogItem, TOKENS_KEY } from './target-catalog';

// 이름 붙여넣기 선택. 붙여넣은 글을 대상 이름으로 나누고 목록 항목과 짝짓는 순수 계산이다. DOM을 모른다.

/** 토큰을 가리키는 이름(소문자) */
const tokenNames: readonly string[] = ['토큰', 'tokens'];
/** 자산을 가리키는 이름(소문자) */
const assetNames: readonly string[] = ['자산', 'assets'];
/** 줄 앞의 목록 표시(`-`, `*`, `+`, `1.`, `1)`) */
const LIST_MARKER = /^(?:[-*+]|\d+[.)])\s+/u;
/** 이름을 감싼 백틱 */
const BACKTICKS = /^`+|`+$/gu;

/**
 * 붙여넣기 선택 결과.
 * - keys: 고를 키(토큰은 TOKENS_KEY, 자산은 ASSETS_KEY). 붙여넣은 순서이고 겹치지 않는다
 * - notFound: 찾지 못한 이름(붙여넣은 그대로)
 */
export type PasteMatch = {
  keys: string[];
  notFound: string[];
};

/**
 * 붙여넣은 글을 이름 목록으로 나눈다. 한 줄에 하나, 또는 쉼표로 잇는다.
 * 빈 줄과 `#`으로 시작하는 줄은 버리고, 줄 앞의 `-`·`*`·번호, 이름을 감싼 백틱, 앞뒤 공백을 뗀다.
 * @codocs [[디자인 시스템:플러그인 화면]]
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
 * `토큰`·`tokens`는 토큰, `자산`·`assets`는 자산, 나머지는 컴포넌트 이름이다.
 * @codocs [[디자인 시스템:플러그인 화면]]
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
    const lower = name.trim().toLowerCase();
    if (tokenNames.includes(lower)) {
      pick(TOKENS_KEY);
      continue;
    }
    if (assetNames.includes(lower)) {
      pick(ASSETS_KEY);
      continue;
    }
    const found = items.filter((item) => item.name.trim().toLowerCase() === lower);
    if (found.length === 0) {
      notFound.push(name);
    }
    for (const item of found) {
      pick(item.key);
    }
  }
  return { keys, notFound };
}
