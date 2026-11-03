// @codocs [[피그마 연동:스토리 규칙]]
// CodeBlock 스토리의 고정 데이터다. 코드와 언어 이름은 피그마 슬롯 기본 내용이고, 강조 결과는 앱의 실제 강조기
// (Shiki) 결과를 옮긴 것이다. 디자인 시스템은 강조기를 가질 수 없어, 앱 단위 테스트가 이 코드를 실제로 강조해
// `lines`와 같은지 확인한다(@codocs [[기술 스택:글 본문 처리]]).

import codeBlockExport from '../../../figma/components/code-block/export.json';
import type { CodeBlockSyntax, CodeBlockToken } from './code-block';

type FigmaTextNode = {
  name?: string;
  text?: { segments: readonly { characters: string }[] };
  children?: readonly FigmaTextNode[];
};

/**
 * export.json 트리에서 이름이 같은 글자 노드의 글자를 찾는다.
 * @param node 찾기 시작할 노드
 * @param name 글자 노드 이름
 * @returns 글자. 없으면 undefined
 */
function findFigmaText(node: FigmaTextNode, name: string): string | undefined {
  if (node.name === name && node.text !== undefined) {
    return node.text.segments.map((segment) => segment.characters).join('');
  }
  for (const child of node.children ?? []) {
    const text = findFigmaText(child, name);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
}

/**
 * 강조된 코드 글자 조각을 만든다.
 * @param text 글자
 * @param syntax 강조 색 갈래. 없으면 기본 코드 글자색
 * @returns 코드 글자 조각
 */
function token(text: string, syntax: CodeBlockSyntax | null = null): CodeBlockToken {
  return { text, syntax };
}

const figmaCode = findFigmaText(codeBlockExport.variants.default.tree, 'code');
if (figmaCode === undefined) {
  throw new Error('CodeBlock export.json에 code 글자가 없다');
}

/**
 * 피그마 CodeBlock 슬롯 기본 내용(코드 2줄)과 그 실제 강조 결과.
 * - `code`: 피그마 Code 슬롯의 글자
 * - `label`: 피그마 Language 속성 기본값(머리에 보이는 언어 이름). Shiki 언어가 아니다
 * - `language`: 강조할 때 쓴 Shiki 언어. 코드가 JSX를 쓰는 TypeScript라 `tsx`다
 * - `lines`: `highlightCode(code, language)` 결과
 */
export const codeBlockStorySample: {
  readonly code: string;
  readonly label: string;
  readonly language: string;
  readonly lines: readonly (readonly CodeBlockToken[])[];
} = {
  code: figmaCode,
  label: codeBlockExport.propertyDefinitions.Language.default,
  language: 'tsx',
  lines: [
    [
      token('const', 'keyword'),
      token(' '),
      token('post', 'variable-constant'),
      token(' '),
      token('=', 'punctuation'),
      token(' '),
      token('use', 'function'),
      token('('),
      token('fetchPost', 'function'),
      token('('),
      token('slug', 'variable'),
      token('))'),
      token(';', 'punctuation'),
    ],
    [
      token('return', 'keyword-control'),
      token(' '),
      token('<', 'tag'),
      token('Article', 'type'),
      token(' '),
      token('post', 'attribute'),
      token('=', 'punctuation'),
      token('{', 'keyword'),
      token('post', 'variable'),
      token('}', 'keyword'),
      token(' '),
      token('/>', 'tag'),
      token(';', 'punctuation'),
    ],
  ],
};
