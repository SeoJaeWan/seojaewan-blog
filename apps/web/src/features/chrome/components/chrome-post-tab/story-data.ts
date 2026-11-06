import type { PostBlock } from '@/shared/utils/post-body/post-body';
import {
  createInitialWorkspace,
  type PostItem,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 이전·다음 글이 있는 글 색인(작성일: 오래된 글 < 가운데 글 < 새 글) */
export const postTabWorkspace = createInitialWorkspace({
  posts: [
    { collection: 'blog', slug: 'old', title: '오래된 글', folderPath: [], date: '2026-01-01' },
    {
      collection: 'blog',
      slug: 'mid',
      title: '가운데 글',
      folderPath: ['React'],
      date: '2026-05-01',
    },
    { collection: 'blog', slug: 'new', title: '새 글', folderPath: [], date: '2026-10-01' },
  ],
  links: [],
});

const midItem = postTabWorkspace.items['post:mid'];

if (midItem?.kind !== 'post') {
  throw new Error('가운데 글이 없다');
}

/** 보는 글(가운데 글) */
export const midPost: PostItem = midItem;

/**
 * 글자만 있는 제목 블록을 만든다.
 * @param label 제목 글자
 * @returns 제목 블록
 */
function heading(label: string): PostBlock {
  return { type: 'heading_2', richText: [{ text: label, link: null }] };
}

/**
 * 스크롤이 생기도록 문단을 여러 개 만든다.
 * @param label 문단 글자
 * @returns 문단 블록들
 */
function filler(label: string): PostBlock[] {
  return Array.from({ length: 24 }, (_unused, index) => ({
    type: 'paragraph' as const,
    richText: [{ text: `${label} ${String(index + 1)}번째 문단`, link: null }],
  }));
}

/** 블로그 안 링크, 바깥 링크, 코드 블록 */
const linkedBlocks: readonly PostBlock[] = [
  {
    type: 'paragraph',
    richText: [
      { text: '앞 글', link: '/posts/old' },
      { text: ' 그리고 ', link: null },
      { text: '바깥', link: 'https://example.com/' },
    ],
  },
  { type: 'code', language: 'ts', code: 'const a = 1;' },
];

/** 링크·코드와 제목 셋(스크롤하려고 문단을 끼운)이 든 본문 */
export const fullBody: readonly PostBlock[] = [
  ...linkedBlocks,
  ...filler('도입'),
  heading('하나'),
  ...filler('하나'),
  heading('둘'),
  ...filler('둘'),
  heading('셋'),
  ...filler('셋'),
];

/** 제목 없이 링크·코드만 든 본문 */
export const noHeadingBody: readonly PostBlock[] = linkedBlocks;
