import 'server-only';

import { type BundledLanguage, bundledLanguages, createHighlighter, type Highlighter } from 'shiki';

import { CODE_SYNTAXES, type CodeSyntax, type CodeToken } from '@/shared/utils/post-body/post-body';

import { CODE_HIGHLIGHT_THEME_NAME, codeHighlightTheme } from './code-highlight-theme';

// 강조기는 한 번만 만들어 계속 쓴다(Shiki는 오래 사는 하나의 강조기를 쓰라고 한다). 언어는 처음 쓸 때 불러온다.
let highlighterRequest: Promise<Highlighter> | null = null;

/**
 * 코드를 Shiki로 강조해 줄마다의 글자 조각으로 돌려준다. 서버가 본문을 만들 때 부른다.
 * 조각의 색은 우리 테마의 `code-syntax` 갈래 이름이고, 기본 글자색인 조각은 색이 없다(null).
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
  const { tokens } = highlighter.codeToTokens(code, {
    lang,
    theme: CODE_HIGHLIGHT_THEME_NAME,
  });
  return tokens.map((line) =>
    mergeTokens(line.map((token) => ({ text: token.content, syntax: toCodeSyntax(token.color) }))),
  );
}

/**
 * 강조기를 돌려준다. 처음 부를 때 우리 테마로 만든다.
 * @returns 강조기
 */
function getHighlighter(): Promise<Highlighter> {
  highlighterRequest ??= createHighlighter({ themes: [codeHighlightTheme], langs: [] });
  return highlighterRequest;
}

/**
 * 테마 색 값(`var(--code-syntax-<갈래>)`)을 갈래 이름으로 바꾼다. 기본 글자색이면 null이다.
 * @param color Shiki가 준 글자 조각의 색
 * @returns 갈래 이름. 기본 글자색이거나 모르는 색이면 null
 */
function toCodeSyntax(color: string | undefined): CodeSyntax | null {
  const name = /^var\(--code-syntax-([a-z-]+)\)$/u.exec(color ?? '')?.[1];
  const syntax = CODE_SYNTAXES.find((candidate) => candidate === name);
  return syntax === undefined || syntax === 'text' ? null : syntax;
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
    if (last !== undefined && last.syntax === token.syntax) {
      last.text += token.text;
    } else {
      merged.push({ ...token });
    }
  }
  return merged;
}
