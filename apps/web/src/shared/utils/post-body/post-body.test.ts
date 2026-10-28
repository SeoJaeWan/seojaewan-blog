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

const paragraph: PostBlock = { type: 'paragraph', richText: [{ text: '문단', link: null }] };

// @codocs [[Chrome:Notion 블록]]
describe('Chrome:Notion 블록', () => {
  it('제목 1~3, 문단, 코드 블록을 받는다', () => {
    const body = {
      blocks: [
        { type: 'heading_1', richText: [{ text: '가', link: null }] },
        { type: 'heading_2', richText: [{ text: '나', link: null }] },
        { type: 'heading_3', richText: [{ text: '다', link: null }] },
        { type: 'paragraph', richText: [{ text: '글', link: '/posts/a' }] },
        { type: 'code', language: 'ts', code: 'const a = 1;' },
      ],
    };
    expect(postBodySchema.safeParse(body).success).toBe(true);
  });
});

// 9단계 전까지의 임시 동작이다. 문서([[Chrome:Notion 블록]])는 지원하지 않는 블록에 안내 상자를 보이지만,
// 지금은 디자인이 없는 블록을 9단계로 미뤄 스키마가 받지 않는다(임의 작업 "본문 블록").
describe('본문 스키마(9단계 전 임시 동작)', () => {
  it('9단계 전까지는 디자인이 없는 블록(인용 등)을 받지 않는다(임시)', () => {
    const body = { blocks: [{ type: 'quote', richText: [{ text: '인용', link: null }] }] };
    expect(postBodySchema.safeParse(body).success).toBe(false);
  });
});

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('제목이 3개 이상이면 제목마다 목차 항목을 만든다', () => {
    const blocks = [heading('하나'), paragraph, heading('둘'), heading('셋')];
    expect(getTocHeadings(blocks)).toEqual([
      { id: 'heading-0', label: '하나' },
      { id: 'heading-2', label: '둘' },
      { id: 'heading-3', label: '셋' },
    ]);
  });

  it('제목이 3개보다 적으면 목차가 없다', () => {
    expect(getTocHeadings([heading('하나'), paragraph, heading('둘')])).toEqual([]);
  });
});
