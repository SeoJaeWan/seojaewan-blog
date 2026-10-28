import { bundledThemes } from 'shiki';
import { describe, expect, it, vi } from 'vitest';

import { CODE_SYNTAXES, type CodeSyntax, type CodeToken } from '@/shared/utils/post-body/post-body';

import { highlightCode } from './code-highlight';
import { codeHighlightTheme, codeSyntaxScopes } from './code-highlight-theme';

vi.mock('server-only', () => ({}));

const source = [
  "import { use } from 'react';",
  '// 글을 읽는다',
  'export function readPost<T>(items: T[], count = 1): boolean {',
  '  if (items === null) return false;',
  '  const post = use(fetchPost(slug));',
  '  return <Article data={post} />;',
  '}',
].join('\n');

/**
 * 강조된 코드에서 글자 조각의 색을 찾는다. 줄 안에서 그 글자와 똑같은 첫 조각을 본다.
 * @param lines 강조된 코드
 * @param text 찾을 글자
 * @returns 색 갈래. 기본 글자색이면 null
 */
function syntaxOf(lines: readonly (readonly CodeToken[])[], text: string): CodeSyntax | null {
  const token = lines.flat().find((candidate) => candidate.text.trim() === text);
  if (token === undefined) {
    throw new Error(`"${text}" 조각이 없다: ${JSON.stringify(lines)}`);
  }
  return token.syntax;
}

/**
 * 견본 코드를 tsx로 강조한다.
 * @returns 강조된 코드
 */
async function highlightSource(): Promise<CodeToken[][]> {
  const lines = await highlightCode(source, 'tsx');
  if (lines === undefined) {
    throw new Error('tsx를 강조하지 않았다');
  }
  return lines;
}

// Light+에서 우리 갈래와 같은 색이다. 이 색의 scope는 모두 그 갈래로 칠한다.
const lightPlusColors: Readonly<Record<string, CodeSyntax>> = {
  '#008000': 'comment',
  '#0000ff': 'keyword',
  '#af00db': 'keyword-control',
  '#a31515': 'string',
  '#098658': 'constant',
  '#795e26': 'function',
  '#267f99': 'type',
  '#800000': 'tag',
  '#e50000': 'attribute',
  '#001080': 'variable',
};

/**
 * 우리 테마에서 scope가 든 갈래.
 * @param scope 문법 범위
 * @returns 갈래. 없으면 undefined
 */
function groupOf(scope: string): CodeSyntax | undefined {
  return CODE_SYNTAXES.find((syntax) =>
    codeSyntaxScopes[syntax].some((candidate) => candidate === scope),
  );
}

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('테마는 색 값을 code-syntax CSS 변수로 넣고 내장 테마를 쓰지 않는다', () => {
    expect(codeHighlightTheme.fg).toBe('var(--code-syntax-text)');
    for (const rule of codeHighlightTheme.settings ?? []) {
      expect(rule.settings.foreground).toMatch(/^var\(--code-syntax-[a-z-]+\)$/u);
    }
  });

  it('true·false·null(constant.language)은 Light+처럼 키워드 갈래로 칠한다', async () => {
    const lines = await highlightSource();
    expect(syntaxOf(lines, 'false')).toBe('keyword');
    expect(syntaxOf(lines, 'null')).toBe('keyword');
    expect(groupOf('constant.language')).toBe('keyword');
  });

  it('흐름 키워드(import·return·if)는 keyword-control, 다른 키워드(function·const)는 keyword로 칠한다', async () => {
    const lines = await highlightSource();
    expect(syntaxOf(lines, 'import')).toBe('keyword-control');
    expect(syntaxOf(lines, 'return')).toBe('keyword-control');
    expect(syntaxOf(lines, 'if')).toBe('keyword-control');
    expect(syntaxOf(lines, 'function')).toBe('keyword');
    expect(syntaxOf(lines, 'const')).toBe('keyword');
  });

  it('문자열·주석·숫자·함수·타입·매개변수·변수·연산자·태그·태그 속성 이름을 각 갈래로 칠한다', async () => {
    const lines = await highlightSource();
    expect(syntaxOf(lines, "'react'")).toBe('string');
    expect(syntaxOf(lines, '// 글을 읽는다')).toBe('comment');
    expect(syntaxOf(lines, '1')).toBe('constant');
    expect(syntaxOf(lines, 'readPost')).toBe('function');
    expect(syntaxOf(lines, 'boolean')).toBe('type');
    expect(syntaxOf(lines, 'count')).toBe('parameter');
    expect(syntaxOf(lines, 'slug')).toBe('variable');
    expect(syntaxOf(lines, 'post')).toBe('variable'); // const로 선언한 변수도 쓰는 곳과 같은 변수 색이다
    expect(syntaxOf(lines, '===')).toBe('punctuation');
    expect(syntaxOf(lines, '/>')).toBe('tag');
    expect(syntaxOf(lines, 'data')).toBe('attribute');
  });

  it('줄마다 글자 조각으로 나누고, 조각을 이으면 원래 코드다', async () => {
    const lines = await highlightSource();
    expect(lines.map((line) => line.map((token) => token.text).join('')).join('\n')).toBe(source);
  });

  it('언어 이름은 대소문자를 가리지 않고 별칭도 받는다', async () => {
    expect(await highlightCode('const a = 1;', 'TypeScript')).toBeDefined();
    expect(await highlightCode('const a = 1;', 'ts')).toBeDefined();
  });

  it('Shiki가 모르는 언어(plain text 등)는 강조하지 않는다', async () => {
    expect(await highlightCode('그냥 글자', 'plain text')).toBeUndefined();
  });

  it('Light+의 scope를 모두 갈래에 묶고, Light+와 같은 색이면 그 색의 갈래로 묶는다', async () => {
    const lightPlus = (await bundledThemes['light-plus']()).default;
    for (const rule of lightPlus.tokenColors ?? []) {
      const foreground = rule.settings.foreground?.toLowerCase();
      if (foreground === undefined) {
        continue; // 글자 모양(굵게·기울임)만 바꾸는 규칙은 따르지 않는다
      }
      for (const scope of [rule.scope ?? []].flat()) {
        const group = groupOf(scope);
        expect(group, scope).toBeDefined();
        const expected = lightPlusColors[foreground];
        // keyword.control은 Light+에서 뒤의 흐름 키워드 규칙이 이긴다
        if (expected !== undefined && !(scope === 'keyword.control' && expected === 'keyword')) {
          expect(group, scope).toBe(expected);
        }
      }
    }
  });

  it('한 scope는 한 갈래에만 둔다', () => {
    const scopes = Object.values(codeSyntaxScopes).flat();
    expect(new Set(scopes).size).toBe(scopes.length);
  });
});
