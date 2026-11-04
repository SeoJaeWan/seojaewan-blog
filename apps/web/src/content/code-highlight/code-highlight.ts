import 'server-only';

import { type BundledLanguage, bundledLanguages, createHighlighter, type Highlighter } from 'shiki';

import type { CodeToken } from '@/shared/utils/post-body/post-body';

/** 코드 강조 테마. Shiki에 들어 있는 VS Code 기본 밝은 테마(Light+)를 그대로 쓴다. */
export const CODE_HIGHLIGHT_THEME = 'light-plus';

/**
 * Light+ 색 가운데 코드 블록 바탕(`#f9f9f9`)에서 대비가 4.5:1에 못 미치는 색을 같은 계열로 살짝 어둡게 바꾼다.
 * 타입 이름 `#267f99`(4.35:1)를 `#257c96`(4.53:1)로 쓴다.
 * @codocs [[접근성:색 대비]]
 */
export const CODE_HIGHLIGHT_COLOR_REPLACEMENTS = { '#267f99': '#257c96' } as const;

// 강조기는 한 번만 만들어 계속 쓴다(Shiki는 오래 사는 하나의 강조기를 쓰라고 한다). 언어는 처음 쓸 때 불러온다.
let highlighterRequest: Promise<Highlighter> | null = null;

/**
 * 코드를 Shiki로 강조해 줄마다의 글자 조각으로 돌려준다. 서버가 본문을 만들 때 부른다.
 * 조각의 색은 Light+가 준 색(hex)이고, 기본 글자색인 조각은 색이 없다(null).
 * Shiki가 모르는 언어(Notion의 `plain text` 등)면 강조하지 않는다.
 * @codocs [[기술 스택:글 본문 처리]]
 * @param code 코드
 * @param language 언어 이름(Notion 코드 블록의 언어. Shiki 언어 이름이나 별칭)
 * @returns 줄마다의 글자 조각. 강조하지 않으면 undefined
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<CodeToken[][] | undefined> {
  const lang = language.toLowerCase();
  if (!isBundledLanguage(lang)) {
    return undefined;
  }
  const highlighter = await getHighlighter();
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    await highlighter.loadLanguage(lang);
  }
  const { tokens, fg } = highlighter.codeToTokens(code, {
    lang,
    theme: CODE_HIGHLIGHT_THEME,
    colorReplacements: CODE_HIGHLIGHT_COLOR_REPLACEMENTS,
  });
  return tokens.map((line) =>
    mergeTokens(
      line.map((token) => ({ text: token.content, color: toTokenColor(token.color, fg) })),
    ),
  );
}

/**
 * 강조기를 돌려준다. 처음 부를 때 Light+로 만든다.
 * @returns 강조기
 */
function getHighlighter(): Promise<Highlighter> {
  highlighterRequest ??= createHighlighter({ themes: [CODE_HIGHLIGHT_THEME], langs: [] });
  return highlighterRequest;
}

/**
 * 글자 조각의 색을 정한다. 테마의 기본 글자색이면 색이 없는 조각(null)이다.
 * @param color Shiki가 준 글자 조각의 색
 * @param defaultColor 테마의 기본 글자색
 * @returns 색(hex, 소문자). 기본 글자색이면 null
 */
function toTokenColor(color: string | undefined, defaultColor: string | undefined): string | null {
  if (color === undefined || color.toLowerCase() === defaultColor?.toLowerCase()) {
    return null;
  }
  return color.toLowerCase();
}

/**
 * Shiki에 들어 있는 언어 이름이나 별칭인지 본다.
 * @param lang 언어 이름(소문자)
 * @returns 들어 있으면 true
 */
function isBundledLanguage(lang: string): lang is BundledLanguage {
  return Object.hasOwn(bundledLanguages, lang);
}

/**
 * 이웃한 같은 색 조각을 하나로 합친다. 보내는 본문을 줄이기 위해서다.
 * @param tokens 한 줄의 글자 조각
 * @returns 합친 글자 조각
 */
function mergeTokens(tokens: readonly CodeToken[]): CodeToken[] {
  const merged: CodeToken[] = [];
  for (const token of tokens) {
    const last = merged.at(-1);
    if (last !== undefined && last.color === token.color) {
      last.text += token.text;
    } else {
      merged.push({ ...token });
    }
  }
  return merged;
}
