// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Notion 블록 견본 조립(Chrome/PostBlocks) 스토리의 고정 데이터다. 피그마 조립과 같은 글자와 블록을 둔다.

import type {
  CodeSyntax,
  CodeToken,
  PostBlock,
  RichText,
} from '@/shared/utils/post-body/post-body';

/**
 * 서식 없는 글자 조각을 만든다.
 * @param text 글자
 * @param annotations 글자 서식
 * @returns 글자 조각
 */
function text(text: string, annotations?: RichText['annotations']): RichText {
  return annotations === undefined ? { text, link: null } : { text, link: null, annotations };
}

/**
 * 강조된 코드 글자 조각을 만든다.
 * @param value 글자
 * @param syntax 강조 색. 없으면 기본 코드 글자색
 * @returns 코드 글자 조각
 */
function token(value: string, syntax: CodeSyntax | null = null): CodeToken {
  return { text: value, syntax };
}

/** 피그마 `code block`의 견본 코드(`code-syntax` 색) */
const sampleCodeLines: CodeToken[][] = [
  [token('// 글을 읽어 제목을 그린다', 'comment')],
  [
    token('import', 'keyword-control'),
    token(' '),
    token('{', 'punctuation'),
    token(' '),
    token('use', 'variable'),
    token(' '),
    token('}', 'punctuation'),
    token(' '),
    token('from', 'keyword-control'),
    token(' '),
    token("'react'", 'string'),
    token(';', 'punctuation'),
  ],
  [],
  [
    token('export', 'keyword-control'),
    token(' '),
    token('function', 'keyword'),
    token(' '),
    token('PostTitle', 'function'),
    token('({', 'punctuation'),
    token(' '),
    token('post', 'parameter'),
    token(' '),
    token('}:', 'punctuation'),
    token(' '),
    token('{', 'punctuation'),
    token(' '),
    token('post', 'parameter'),
    token(':', 'punctuation'),
    token(' '),
    token('Post', 'type'),
    token(' '),
    token('})', 'punctuation'),
    token(' '),
    token('{', 'punctuation'),
  ],
  [
    token('  '),
    token('const', 'keyword'),
    token(' '),
    token('count', 'variable'),
    token(' '),
    token('=', 'punctuation'),
    token(' '),
    token('3', 'constant'),
    token(';', 'punctuation'),
  ],
  [
    token('  '),
    token('return', 'keyword-control'),
    token(' '),
    token('<', 'tag'),
    token('h1', 'tag'),
    token(' '),
    token('className', 'attribute'),
    token('=', 'punctuation'),
    token('"title"', 'string'),
    token('>', 'tag'),
    token('{', 'punctuation'),
    token('post', 'variable'),
    token('.', 'punctuation'),
    token('title', 'variable'),
    token('}', 'punctuation'),
    token('</', 'tag'),
    token('h1', 'tag'),
    token('>', 'tag'),
    token(';', 'punctuation'),
  ],
  [token('}', 'punctuation')],
];

/** 피그마 Chrome/PostBlocks: Notion 블록을 한 번씩 담은 견본 */
export const sampleBlocks: PostBlock[] = [
  { type: 'heading_1', richText: [text('Notion 블록 견본')] },
  { type: 'heading_2', richText: [text('글자 서식과 목록')] },
  {
    type: 'paragraph',
    richText: [
      text('문단에는 '),
      text('굵게', { bold: true }),
      text(', '),
      text('italic', { italic: true }),
      text(', '),
      text('밑줄', { underline: true }),
      text(', '),
      text('취소선', { strikethrough: true }),
      text(', '),
      text('inlineCode()', { code: true }),
      text(', '),
      { text: '링크', link: 'https://react.dev' },
      text('를 섞어 쓸 수 있다.'),
    ],
  },
  {
    type: 'bulleted_list_item',
    richText: [text('글머리 목록 항목')],
    children: [{ type: 'bulleted_list_item', richText: [text('한 단계 들여쓴 항목')] }],
  },
  { type: 'bulleted_list_item', richText: [text('글머리 목록 두 번째 항목')] },
  {
    type: 'numbered_list_item',
    richText: [text('번호 목록 항목')],
    children: [{ type: 'numbered_list_item', richText: [text('한 단계 들여쓴 항목')] }],
  },
  { type: 'numbered_list_item', richText: [text('번호 목록 두 번째 항목')] },
  { type: 'heading_3', richText: [text('할 일 목록')] },
  { type: 'to_do', richText: [text('끝낸 할 일')], checked: true },
  {
    type: 'to_do',
    richText: [text('남은 할 일')],
    checked: false,
    children: [{ type: 'to_do', richText: [text('한 단계 들여쓴 할 일')], checked: false }],
  },
  { type: 'quote', richText: [text('인용 블록의 글이다. 출처나 강조할 문장을 담는다.')] },
  {
    type: 'callout',
    richText: [
      text('콜아웃은 아이콘과 함께 눈에 띄게 보여 줄 글을 담는다. '),
      text('글자 서식', { bold: true }),
      text('도 쓸 수 있다.'),
    ],
  },
  {
    type: 'code',
    language: 'tsx',
    code: sampleCodeLines.map((line) => line.map((part) => part.text).join('')).join('\n'),
    highlighted: sampleCodeLines,
  },
  {
    type: 'image',
    url: 'https://seojaewan.com/images/bloom.png',
    caption: [text('이미지 아래에 붙는 캡션')],
  },
  { type: 'divider' },
  {
    type: 'toggle',
    richText: [text('펼친 토글')],
    children: [{ type: 'paragraph', richText: [text('토글을 펼치면 보이는 글이다.')] }],
  },
  {
    type: 'toggle',
    richText: [text('접힌 토글')],
    children: [{ type: 'paragraph', richText: [text('접혀 있어 보이지 않는 글이다.')] }],
  },
  {
    type: 'table',
    hasColumnHeader: true,
    rows: [
      [[text('훅')], [text('하는 일')]],
      [[text('use')], [text('Promise와 Context를 렌더링 중에 읽는다')]],
      [[text('useActionState')], [text('폼 제출 결과와 대기 상태를 다룬다')]],
    ],
  },
  {
    type: 'bookmark',
    url: 'https://react.dev',
    title: 'React 공식 문서',
    description: 'React로 사용자 인터페이스를 만드는 방법을 배운다.',
  },
  { type: 'equation', expression: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { type: 'unsupported', typeName: 'embed' },
];

/** 피그마에서 펼쳐 둔 토글(`펼친 토글`)의 차례 */
export const expandedToggleIndexes: readonly number[] = [
  sampleBlocks.findIndex((block) => block.type === 'toggle'),
];
