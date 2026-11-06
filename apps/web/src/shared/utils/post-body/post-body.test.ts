import { describe, expect, it } from 'vitest';

import { getTocHeadings, type PostBlock, postBodySchema } from './post-body';

/**
 * 제목 블록을 만든다.
 * @param label 제목 글자
 * @returns 제목 블록
 */
function heading(label: string): PostBlock {
  return { type: 'heading_2', richText: [{ text: label, link: null }] };
}

/**
 * 서식 없는 글자 조각을 만든다.
 * @param value 글자
 * @returns 글자 조각
 */
function text(value: string): { text: string; link: null } {
  return { text: value, link: null };
}

const paragraph: PostBlock = { type: 'paragraph', richText: [{ text: '문단', link: null }] };

// @codocs [[Notion 블록:지원 블록]]
// @codocs [[Notion 블록:지원하지 않는 블록]]
describe('Notion 블록', () => {
  it('제목 1~3, 문단, 코드 블록을 받는다', () => {
    const body = {
      blocks: [
        { type: 'heading_1', richText: [{ text: '가', link: null }] },
        { type: 'heading_2', richText: [{ text: '나', link: null }] },
        { type: 'heading_3', richText: [{ text: '다', link: null }] },
        { type: 'paragraph', richText: [{ text: '글', link: '/posts/a' }] },
        { type: 'code', language: 'ts', code: 'const a = 1;' },
      ],
      cover: null,
    };
    expect(postBodySchema.safeParse(body).success).toBe(true);
  });

  it('글자 서식, 들여쓴 목록·할 일, 인용, 콜아웃, 이미지, 구분선, 토글, 표, 북마크, 수식을 받는다', () => {
    const body = {
      blocks: [
        {
          type: 'paragraph',
          richText: [
            { text: '굵게', link: null, annotations: { bold: true } },
            { text: 'code()', link: null, annotations: { code: true } },
          ],
        },
        {
          type: 'bulleted_list_item',
          richText: [text('항목')],
          children: [{ type: 'bulleted_list_item', richText: [text('하위')] }],
        },
        { type: 'numbered_list_item', richText: [text('번호')] },
        { type: 'to_do', richText: [text('할 일')], isChecked: true },
        { type: 'quote', richText: [text('인용')] },
        { type: 'callout', richText: [text('콜아웃')] },
        {
          type: 'code',
          language: 'ts',
          code: 'const a',
          highlighted: [
            [
              { text: 'const', color: '#0000ff' },
              { text: ' a', color: null },
            ],
          ],
        },
        {
          type: 'image',
          url: 'https://example.com/a.png',
          width: 1440,
          height: 810,
          caption: [text('캡션')],
        },
        { type: 'divider' },
        { type: 'toggle', richText: [text('토글')], children: [{ type: 'divider' }] },
        { type: 'table', hasColumnHeader: true, rows: [[[text('가')], [text('나')]]] },
        { type: 'bookmark', url: 'https://react.dev', title: 'React', description: '설명' },
        { type: 'equation', expression: 'x^2' },
        { type: 'unsupported', typeName: 'embed' },
      ],
      cover: null,
    };
    expect(postBodySchema.safeParse(body).success).toBe(true);
  });

  it('지원하지 않는 블록은 unsupported 블록으로 바꿔 보내야 하고, 모르는 종류는 받지 않는다', () => {
    const body = { blocks: [{ type: 'embed', url: 'https://example.com' }], cover: null };
    expect(postBodySchema.safeParse(body).success).toBe(false);
  });
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  const image = { url: 'https://images.seojaewan.com/notion/a/1', caption: [] };

  it('이미지 블록과 커버는 폭·높이를 갖는다', () => {
    const cover = {
      url: 'https://images.seojaewan.com/notion/cover/a/1',
      width: 1440,
      height: 480,
    };
    const body = { blocks: [{ type: 'image', ...image, width: 720, height: 405 }], cover };
    expect(postBodySchema.safeParse(body).success).toBe(true);
  });

  it('크기를 모르면 폭·높이가 null이다', () => {
    const body = { blocks: [{ type: 'image', ...image, width: null, height: null }], cover: null };
    expect(postBodySchema.safeParse(body).success).toBe(true);
  });

  it('폭·높이가 빠진 이미지 블록은 받지 않는다', () => {
    expect(
      postBodySchema.safeParse({ blocks: [{ type: 'image', ...image }], cover: null }).success,
    ).toBe(false);
  });
});

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('제목마다 목차 항목을 만든다', () => {
    const blocks = [heading('하나'), paragraph, heading('둘'), heading('셋')];
    expect(getTocHeadings(blocks)).toEqual([
      { id: 'heading-0', label: '하나' },
      { id: 'heading-2', label: '둘' },
      { id: 'heading-3', label: '셋' },
    ]);
  });

  it('제목이 1개여도 목차 항목을 만든다', () => {
    expect(getTocHeadings([paragraph, heading('하나')])).toEqual([
      { id: 'heading-1', label: '하나' },
    ]);
  });

  it('제목이 없으면 목차가 없다', () => {
    expect(getTocHeadings([paragraph])).toEqual([]);
  });
});
