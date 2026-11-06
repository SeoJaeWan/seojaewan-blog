import { describe, expect, it } from 'vitest';

import { readPostRows } from './notion-rows';

type PageOptions = {
  isPublic?: boolean;
  title?: string;
  slug?: string;
  folder?: string;
  date?: string | null;
  cover?: unknown;
};

/**
 * 글자 속성 값을 만든다.
 * @param text 글자
 * @returns Notion 글자 조각들
 */
function richText(text: string): unknown[] {
  return text === ''
    ? []
    : [
        {
          plain_text: text,
          href: null,
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ];
}

/**
 * 데이터베이스 행(Notion 페이지 응답)을 만든다.
 * @param id 페이지 ID
 * @param options 속성 값
 * @returns 페이지 응답
 */
function page(id: string, options: PageOptions = {}): unknown {
  const {
    isPublic = true,
    title = '제목',
    slug = id,
    folder = '',
    date = '2026-10-20',
    cover = null,
  } = options;
  return {
    object: 'page',
    id,
    last_edited_time: '2026-11-06T02:33:00.000Z',
    cover,
    properties: {
      제목: { type: 'title', title: richText(title) },
      slug: { type: 'rich_text', rich_text: richText(slug) },
      폴더: { type: 'rich_text', rich_text: richText(folder) },
      공개: { type: 'checkbox', checkbox: isPublic },
      작성일: { type: 'date', date: date === null ? null : { start: date, end: null } },
      Summary: { type: 'rich_text', rich_text: richText('요약') },
      Tags: { type: 'multi_select', multi_select: [] },
    },
  };
}

// @codocs [[콘텐츠 원천:공개 여부]]
describe('콘텐츠 원천:공개 여부', () => {
  it('공개가 체크된 행만 가져온다', () => {
    expect(
      readPostRows([page('shown'), page('hidden', { isPublic: false })]).map((row) => row.slug),
    ).toEqual(['shown']);
  });

  it('공개하지 않은 행은 slug·작성일·제목이 비어 있어도 깨지지 않는다', () => {
    expect(
      readPostRows([page('draft', { isPublic: false, slug: '', title: '', date: null })]),
    ).toEqual([]);
  });

  it('공개 행에 slug나 작성일이 없으면 오류다', () => {
    expect(() => readPostRows([page('a', { slug: '' })])).toThrow('공개 행의 값이 맞지 않다');
    expect(() => readPostRows([page('a', { date: null })])).toThrow('공개 행의 값이 맞지 않다');
  });
});

// @codocs [[콘텐츠 원천:Notion 속성]]
describe('콘텐츠 원천:Notion 속성', () => {
  it('제목, slug, 폴더, 작성일, Summary와 페이지 ID, 고친 시각을 읽는다', () => {
    expect(
      readPostRows([page('react-19-hooks', { title: 'React 19', folder: 'React/Hooks' })]),
    ).toEqual([
      {
        pageId: 'react-19-hooks',
        title: 'React 19',
        slug: 'react-19-hooks',
        folder: 'React/Hooks',
        publishedAt: '2026-10-20',
        cover: null,
        summary: '요약',
        lastEditedAt: '2026-11-06T02:33:00.000Z',
      },
    ]);
  });

  it('작성일에 시각이 있으면 날짜만 쓴다', () => {
    expect(
      readPostRows([page('a', { date: '2026-10-20T09:00:00.000+09:00' })])[0]?.publishedAt,
    ).toBe('2026-10-20');
  });

  it('커버가 있으면 이미지 서버 주소로 바꾼다', () => {
    const [row] = readPostRows([
      page('a', { cover: { type: 'external', external: { url: 'https://example.com/a.png' } } }),
    ]);
    expect(row?.cover).toMatch(
      /^https:\/\/images\.seojaewan\.com\/notion\/cover\/a\/[0-9a-f]{12}$/u,
    );
  });

  it('행은 작성일이 늦은 것부터 놓는다', () => {
    expect(
      readPostRows([page('old', { date: '2026-01-01' }), page('new', { date: '2026-10-01' })]).map(
        (row) => row.slug,
      ),
    ).toEqual(['new', 'old']);
  });
});
