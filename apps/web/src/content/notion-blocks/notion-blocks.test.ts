import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { NOTION_FIXTURE_PAGE_ID } from '@/content/content-collections/content-collections';
import { type NotionBlockNode, readBlockTree } from '@/content/notion-client/notion-client';
import { loadNotionFixtureClient } from '@/content/notion-fixture/notion-fixture';
import { renderPostBlocks } from '@/content/post-body-render/post-body-render';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { toPostBlocks } from './notion-blocks';

vi.mock('server-only', () => ({}));

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

/**
 * 모든 블록을 넣은 시험용 Notion 페이지(fixture)의 블록 나무를 읽는다.
 * @returns 블록 나무
 */
async function readFixturePage(): Promise<NotionBlockNode[]> {
  return readBlockTree(await loadNotionFixtureClient(), NOTION_FIXTURE_PAGE_ID);
}

/**
 * 시험용 페이지를 본문 블록으로 바꾼다.
 * @returns 본문 블록
 */
async function fixtureBlocks(): Promise<PostBlock[]> {
  return toPostBlocks(await readFixturePage());
}

/**
 * 본문 블록 가운데 한 종류만 고른다.
 * @param blocks 본문 블록
 * @param type 블록 종류
 * @returns 그 종류의 블록
 */
function blocksOf<T extends PostBlock['type']>(
  blocks: readonly PostBlock[],
  type: T,
): Extract<PostBlock, { type: T }>[] {
  return blocks.filter((block): block is Extract<PostBlock, { type: T }> => block.type === type);
}

// @codocs [[Notion 블록:지원 블록]]
describe('Notion 블록:지원 블록', () => {
  it('지원 블록 12종을 모두 본문 블록으로 바꾼다', async () => {
    const types = new Set((await fixtureBlocks()).map((block) => block.type));
    for (const type of [
      'heading_1',
      'paragraph',
      'bulleted_list_item',
      'numbered_list_item',
      'to_do',
      'quote',
      'callout',
      'code',
      'image',
      'divider',
      'toggle',
      'table',
      'bookmark',
      'equation',
    ] as const) {
      expect(types).toContain(type);
    }
  });

  it('제목 1·2·3을 같은 단계의 제목 블록으로 바꾼다', async () => {
    const blocks = await fixtureBlocks();
    expect(blocks.slice(1, 4)).toEqual([
      { type: 'heading_1', richText: [{ text: '제목 1', link: null }] },
      { type: 'heading_2', richText: [{ text: '제목 2', link: null }] },
      { type: 'heading_3', richText: [{ text: '제목 3', link: null }] },
    ]);
  });

  it('글머리·번호 목록은 3단계 중첩을 하위 블록으로 품는다', async () => {
    const blocks = await fixtureBlocks();
    expect(blocksOf(blocks, 'bulleted_list_item')[0]).toEqual({
      type: 'bulleted_list_item',
      richText: [{ text: '글머리 1단계', link: null }],
      children: [
        {
          type: 'bulleted_list_item',
          richText: [{ text: '글머리 2단계', link: null }],
          children: [
            { type: 'bulleted_list_item', richText: [{ text: '글머리 3단계', link: null }] },
          ],
        },
      ],
    });
    expect(blocksOf(blocks, 'numbered_list_item')[0]).toEqual({
      type: 'numbered_list_item',
      richText: [{ text: '번호 1단계', link: null }],
      children: [
        {
          type: 'numbered_list_item',
          richText: [{ text: '번호 2단계', link: null }],
          children: [
            { type: 'numbered_list_item', richText: [{ text: '번호 3단계', link: null }] },
          ],
        },
      ],
    });
  });

  it('할 일은 켬·끔을 옮긴다', async () => {
    expect(blocksOf(await fixtureBlocks(), 'to_do')).toEqual([
      { type: 'to_do', richText: [{ text: '끝낸 일', link: null }], isChecked: true },
      { type: 'to_do', richText: [{ text: '남은 일', link: null }], isChecked: false },
    ]);
  });

  it('토글은 안의 제목과 목록을 하위 블록으로 품는다', async () => {
    expect(blocksOf(await fixtureBlocks(), 'toggle')).toEqual([
      {
        type: 'toggle',
        richText: [{ text: '토글 제목', link: null }],
        children: [
          { type: 'heading_3', richText: [{ text: '토글 안 제목', link: null }] },
          { type: 'bulleted_list_item', richText: [{ text: '토글 안 목록', link: null }] },
        ],
      },
    ]);
  });

  it('인용·콜아웃은 글을 옮기고 콜아웃 아이콘은 버린다', async () => {
    const blocks = await fixtureBlocks();
    expect(blocksOf(blocks, 'quote')).toEqual([
      { type: 'quote', richText: [{ text: '인용 문장', link: null }] },
    ]);
    expect(blocksOf(blocks, 'callout')).toEqual([
      { type: 'callout', richText: [{ text: '콜아웃 문장', link: null }] },
    ]);
  });

  it('코드는 Notion 언어 이름과 코드 글자를 옮긴다', async () => {
    expect(blocksOf(await fixtureBlocks(), 'code')).toEqual([
      {
        type: 'code',
        language: 'typescript',
        code: 'const answer: number = 42;\nconsole.log(answer);',
      },
    ]);
  });

  it('이미지는 Notion 주소가 아니라 이미지 서버 주소로 그린다', async () => {
    const [image] = blocksOf(await fixtureBlocks(), 'image');
    expect(image?.url).toMatch(
      /^https:\/\/images\.seojaewan\.com\/notion\/[0-9a-f-]{36}\/\d{8}T\d{6}Z$/u,
    );
    expect(image?.caption).toEqual([]);
  });

  it('구분선, 표, 북마크를 옮긴다', async () => {
    const blocks = await fixtureBlocks();
    expect(blocksOf(blocks, 'divider')).toEqual([{ type: 'divider' }]);
    const [table] = blocksOf(blocks, 'table');
    expect(table?.hasColumnHeader).toBe(true);
    expect(table?.rows).toHaveLength(3);
    expect(table?.rows.every((row) => row.length === 2)).toBe(true);
    expect(blocksOf(blocks, 'bookmark')).toEqual([
      {
        type: 'bookmark',
        url: 'https://nextjs.org/docs',
        title: 'https://nextjs.org/docs',
        description: '',
      },
    ]);
  });

  it('수식은 식을 옮기고, 보낼 때 바른 식만 KaTeX로 그리며 잘못된 식은 경고를 남긴다', async () => {
    const equations = blocksOf(await fixtureBlocks(), 'equation');
    expect(equations.map((block) => block.expression)).toEqual(['E = mc^2', '\\frac{']);
    const rendered = blocksOf(await renderPostBlocks(equations), 'equation');
    expect(rendered[0]?.html).toContain('katex');
    expect(rendered[1]?.html).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('수식을 그리지 못했다'));
  });
});

// @codocs [[Notion 블록:모양]]
describe('Notion 블록:모양', () => {
  it('글자 서식은 겹친 것까지 옮기고 링크를 옮긴다', async () => {
    const [, , , , formats] = await fixtureBlocks();
    expect(formats?.type === 'paragraph' && formats.richText).toEqual([
      { text: '보통 ', link: null },
      { text: '굵게', link: null, annotations: { bold: true } },
      { text: ' ', link: null },
      { text: '기울임', link: null, annotations: { italic: true } },
      { text: ' ', link: null },
      { text: '밑줄', link: null, annotations: { underline: true } },
      { text: ' ', link: null },
      { text: '취소선', link: null, annotations: { strikethrough: true } },
      { text: ' ', link: null },
      { text: '인라인 코드', link: null, annotations: { code: true } },
      { text: ' ', link: null },
      { text: '링크', link: 'https://developers.notion.com/' },
      { text: ' ', link: null },
      {
        text: '굵은 기울임 링크',
        link: 'https://react.dev/',
        annotations: { bold: true, italic: true },
      },
    ]);
  });

  it('Notion 색(글자색, 형광펜)은 버린다', async () => {
    const [, , , , , colors] = await fixtureBlocks();
    expect(
      colors?.type === 'paragraph' &&
        colors.richText.every((part) => part.annotations === undefined),
    ).toBe(true);
  });
});

// @codocs [[Notion 블록:지원하지 않는 블록]]
describe('Notion 블록:지원하지 않는 블록', () => {
  it('지원하지 않는 블록은 그 자리에 유형 이름을 담은 안내 블록을 두고 경고를 남긴다', async () => {
    const blocks = await fixtureBlocks();
    expect(blocksOf(blocks, 'unsupported')).toEqual([
      { type: 'unsupported', typeName: 'embed' },
      { type: 'unsupported', typeName: 'child_database' },
      { type: 'unsupported', typeName: 'child_database' },
      { type: 'unsupported', typeName: 'child_database' },
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('지원하지 않는 블록이다: embed'));
  });

  it('하위 블록을 품지 못하는 블록의 하위 블록은 그 블록 바로 뒤에 둔다', () => {
    expect(
      toPostBlocks([
        {
          block: paragraph('a', '부모'),
          children: [{ block: paragraph('b', '자식'), children: [] }],
        },
      ]),
    ).toEqual([
      { type: 'paragraph', richText: [{ text: '부모', link: null }] },
      { type: 'paragraph', richText: [{ text: '자식', link: null }] },
    ]);
  });
});

/**
 * 문단 블록 응답을 만든다.
 * @param id 블록 ID
 * @param text 글자
 * @returns 문단 블록 응답
 */
function paragraph(id: string, text: string): unknown {
  return {
    object: 'block',
    id,
    type: 'paragraph',
    has_children: false,
    last_edited_time: '2026-11-06T00:00:00.000Z',
    paragraph: {
      rich_text: [
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
      ],
    },
  };
}
