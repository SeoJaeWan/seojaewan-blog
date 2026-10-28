import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { PostBlocks } from './post-blocks';

/**
 * 서식 없는 글자 조각을 만든다.
 * @param value 글자
 * @returns 글자 조각
 */
function text(value: string): { text: string; link: null } {
  return { text: value, link: null };
}

/**
 * 문단 하나를 내용으로 가진 토글 블록을 만든다.
 * @param title 토글 제목
 * @returns 토글 블록
 */
function toggle(title: string): PostBlock {
  return {
    type: 'toggle',
    richText: [text(title)],
    children: [{ type: 'paragraph', richText: [text(`${title} 내용`)] }],
  };
}

// @codocs [[Chrome:Notion 블록]]
describe('Chrome:Notion 블록', () => {
  it('제목 1·2·3을 Title·Subtitle·Body Large Strong 글자 스타일로 그리고 맨 위 제목에 id를 단다', () => {
    const blocks: PostBlock[] = [
      { type: 'heading_1', richText: [text('하나')] },
      { type: 'heading_2', richText: [text('둘')] },
      { type: 'heading_3', richText: [text('셋')] },
    ];
    render(<PostBlocks blocks={blocks} />);
    expect(screen.getByRole('heading', { name: '하나' })).toHaveClass('type-title');
    expect(screen.getByRole('heading', { name: '둘' })).toHaveClass('type-subtitle');
    expect(screen.getByRole('heading', { name: '셋' })).toHaveClass('type-body-large-strong');
    expect(screen.getByRole('heading', { name: '셋' })).toHaveAttribute('id', 'heading-2');
  });

  it('인라인 코드는 배경 없이 코드 서체와 post/inline-code 글자색으로 그린다', () => {
    render(
      <PostBlocks
        blocks={[
          { type: 'paragraph', richText: [{ ...text('code()'), annotations: { code: true } }] },
        ]}
      />,
    );
    expect(screen.getByText('code()')).toHaveClass('type-code', 'text-post-inline-code');
  });

  it('이어진 같은 종류의 목록 항목을 한 목록으로 묶고 하위 항목은 안에 그린다', () => {
    const blocks: PostBlock[] = [
      {
        type: 'bulleted_list_item',
        richText: [text('가')],
        children: [{ type: 'bulleted_list_item', richText: [text('가-1')] }],
      },
      { type: 'bulleted_list_item', richText: [text('나')] },
      { type: 'numbered_list_item', richText: [text('다')] },
    ];
    render(<PostBlocks blocks={blocks} />);
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(3);
    expect(lists[0]?.tagName).toBe('UL');
    expect(lists[2]?.tagName).toBe('OL');
    expect(screen.getByText('1.')).toBeInTheDocument();
  });

  it('할 일은 읽기 전용 체크 표시로 상태를 보인다', () => {
    render(<PostBlocks blocks={[{ type: 'to_do', richText: [text('끝')], checked: true }]} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('지원하지 않는 블록 자리에 유형 이름을 담은 안내 상자를 보인다', () => {
    render(<PostBlocks blocks={[{ type: 'unsupported', typeName: 'embed' }]} />);
    expect(screen.getByText('지원하지 않는 블록(embed)')).toBeInTheDocument();
  });

  it('펼쳐 두라고 한 토글만 내용을 그린다', () => {
    render(<PostBlocks blocks={[toggle('펼침'), toggle('접힘')]} expandedToggleIndexes={[0]} />);
    expect(screen.getByText('펼침 내용')).toBeInTheDocument();
    expect(screen.queryByText('접힘 내용')).toBeNull();
  });
});

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('서버가 강조한 코드 조각을 code-syntax 색으로 칠한다', () => {
    render(
      <PostBlocks
        blocks={[
          {
            type: 'code',
            language: 'ts',
            code: 'return true;',
            highlighted: [
              [
                { text: 'return', syntax: 'keyword-control' },
                { text: ' ', syntax: null },
                { text: 'true', syntax: 'keyword' },
                { text: ';', syntax: 'punctuation' },
              ],
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('return')).toHaveClass('text-code-syntax-keyword-control');
    expect(screen.getByText('true')).toHaveClass('text-code-syntax-keyword');
  });

  it('서버가 KaTeX로 그린 수식 HTML을 Equation 자리에 넣는다', async () => {
    render(
      <PostBlocks
        blocks={[
          {
            type: 'equation',
            expression: 'x',
            html: '<span class="katex-display"><span class="katex">수식 그림</span></span>',
          },
        ]}
      />,
    );
    expect(await screen.findByText('수식 그림')).toHaveClass('katex');
  });

  it('서버가 그리지 못한 수식은 식 글자를 코드 서체로 보인다', () => {
    render(<PostBlocks blocks={[{ type: 'equation', expression: String.raw`\frac{1` }]} />);
    expect(screen.getByText(String.raw`\frac{1`)).toHaveClass('type-code');
  });
});
