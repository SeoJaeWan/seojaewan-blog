import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ImageAsset } from '@seojaewan/design-system';

import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { PostBlocks } from './post-blocks';
import { expandedToggleIndexes, sampleBlocks } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
// 본문은 크기를 갖지 않고 글 화면이 정하므로 피그마 원본 너비(size/720)와 페이지 바탕으로 감싼다.
// 이미지는 피그마처럼 배경화면 Bloom을 자산 원본 비율로, 수식은 근의 공식 그림(200×56)으로 넣는다.
const meta = {
  title: 'Patterns/Chrome/PostBlocks',
  render: () => (
    <div className="w-size-post-width bg-chrome-page-fill">
      <PostBlocks
        blocks={sampleBlocks}
        expandedToggleIndexes={expandedToggleIndexes}
        renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
        renderEquation={() => (
          <ImageAsset
            name="images/equation-quadratic-formula"
            alt="x = (-b ± √(b² - 4ac)) / 2a"
            className="h-size-story-xs w-size-story-lg"
          />
        )}
      />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// 색 대비는 피그마 값을 사람이 판단할 때까지 이 스토리에서 끈다(임의 작업 문서의 "색 대비 위반" 항목).
export const Figma: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

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

const structureBlocks: PostBlock[] = [
  { type: 'heading_1', richText: [text('하나')] },
  { type: 'heading_2', richText: [text('둘')] },
  { type: 'heading_3', richText: [text('셋')] },
  {
    type: 'bulleted_list_item',
    richText: [text('가')],
    children: [{ type: 'bulleted_list_item', richText: [text('가-1')] }],
  },
  { type: 'bulleted_list_item', richText: [text('나')] },
  { type: 'numbered_list_item', richText: [text('다')] },
  { type: 'to_do', richText: [text('끝')], checked: true },
  { type: 'unsupported', typeName: 'embed' },
  toggle('펼침'),
  toggle('접힘'),
  { type: 'equation', expression: String.raw`\frac{1` },
  {
    type: 'equation',
    expression: 'x',
    html: '<span class="katex-display"><span class="katex">수식 그림</span></span>',
  },
];

// @codocs [[Notion 블록:지원 블록]]
// @codocs [[Notion 블록:지원하지 않는 블록]]
// @codocs [[기술 스택:글 본문 처리]]
/** 글 본문을 그리는 구조: 제목 id, 목록 묶기, 할 일, 안내 상자, 토글, 수식 */
export const Structure: Story = {
  render: () => <PostBlocks blocks={structureBlocks} expandedToggleIndexes={[8]} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('제목 1·2·3은 제목 역할로 그리고 맨 위 제목부터 차례대로 id를 단다', async () => {
      await expect(canvas.getByRole('heading', { name: '하나', level: 2 })).toBeInTheDocument();
      await expect(canvas.getByRole('heading', { name: '셋' })).toHaveAttribute('id', 'heading-2');
    });

    await step(
      '이어진 같은 종류의 목록 항목을 한 목록으로 묶고 하위 항목은 안에 그린다',
      async () => {
        const lists = canvas.getAllByRole('list');
        const bulleted = lists.find(
          (list) => list.tagName === 'UL' && list.textContent.includes('가'),
        );
        const numbered = lists.find((list) => list.tagName === 'OL');
        await expect(bulleted).toBeDefined();
        await expect(within(bulleted ?? canvasElement).getByText('나')).toBeInTheDocument();
        await expect(within(bulleted ?? canvasElement).getByText('가-1')).toBeInTheDocument();
        await expect(within(numbered ?? canvasElement).getByText('다')).toBeInTheDocument();
        await expect(canvas.getByText('1.')).toBeInTheDocument();
      },
    );

    await step('할 일은 읽기 전용 체크 표시로 상태를 보인다', async () => {
      await expect(canvas.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    });

    await step('지원하지 않는 블록 자리에 유형 이름을 담은 안내 상자를 보인다', async () => {
      await expect(canvas.getByText('지원하지 않는 블록(embed)')).toBeInTheDocument();
    });

    await step('펼쳐 두라고 한 토글만 내용을 그린다', async () => {
      await expect(canvas.getByText('펼침 내용')).toBeInTheDocument();
      await expect(canvas.queryByText('접힘 내용')).toBeNull();
    });

    await step('서버가 KaTeX로 그린 수식 HTML을 Equation 자리에 넣는다', async () => {
      // KaTeX 그림 부품은 lazy라 첫 조각을 받는 시간까지 기다린다
      await expect(await canvas.findByText('수식 그림', {}, { timeout: 5000 })).toBeVisible();
    });

    await step('서버가 그리지 못한 수식은 식 글자를 보인다', async () => {
      await expect(canvas.getByText(String.raw`\frac{1`)).toBeVisible();
    });
  },
};

const annotationBlocks: PostBlock[] = [
  {
    type: 'paragraph',
    richText: [
      {
        text: '모두',
        link: null,
        annotations: { bold: true, italic: true, underline: true, strikethrough: true },
      },
      { text: '굵은 코드', link: null, annotations: { bold: true, code: true } },
    ],
  },
  {
    type: 'table',
    hasColumnHeader: false,
    rows: [[[{ text: '표 칸 굵게', link: null, annotations: { bold: true } }]]],
  },
];

// @codocs [[Notion 블록:모양]]
/** 글자 서식은 겹쳐 그린다: 굵게+기울임+밑줄+취소선이 한 조각에 모두 적용되고 표 칸에도 적용된다 */
export const Annotations: Story = {
  render: () => <PostBlocks blocks={annotationBlocks} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('한 조각의 굵게·기울임·밑줄·취소선을 모두 적용한다', async () => {
      const strong = canvas.getByText('모두').closest('strong');
      const style = getComputedStyle(canvas.getByText('모두'));
      await expect(strong).not.toBeNull();
      await expect(Number(getComputedStyle(strong ?? canvasElement).fontWeight)).toBeGreaterThan(
        500,
      );
      await expect(style.fontStyle).toBe('italic');
      const decorated = canvas.getByText('모두').closest('em');
      await expect(decorated?.closest('u')).not.toBeNull();
      await expect(decorated?.closest('s')).not.toBeNull();
    });

    await step('굵은 인라인 코드는 코드 서체로 굵게 그린다', async () => {
      const strong = canvas.getByText('굵은 코드');
      await expect(Number(getComputedStyle(strong).fontWeight)).toBeGreaterThan(500);
      await expect(strong.closest('span')).not.toBeNull();
    });

    await step('표 칸 글자에도 굵게를 적용한다', async () => {
      await expect(canvas.getByText('표 칸 굵게').tagName).toBe('STRONG');
    });
  },
};
