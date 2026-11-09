import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { expect, within } from 'storybook/test';

import columnsExport from '../../../figma/components/columns/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Column } from '../column/column';
import { Quote } from '../quote/quote';
import { Columns } from './columns';

// 피그마 Columns Layout 변형 값이다(정규화한 이름).
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

/**
 * 피그마 Column 슬롯 기본 내용(Quote 하나)을 넣은 열이다.
 * @param props 속성
 * @param props.text 인용 글
 * @returns Column
 */
function SampleColumn({ text }: { text: string }): JSX.Element {
  return (
    <Column>
      <Quote>
        <p>{text}</p>
      </Quote>
    </Column>
  );
}

const meta = {
  title: 'Components/Columns',
  args: { layout: 'wide' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 너비(@sample-size width)로 감싼다.
  // Columns 슬롯에는 피그마 슬롯 기본 내용(Column 두 개)을 넣는다.
  decorators: [figmaFrame(columnsExport)],
  render: (args) => (
    <Columns layout={args.layout}>
      <SampleColumn text="인용 블록의 글이다. 출처나 강조할 문장을 담는다." />
      <SampleColumn text="인용 블록의 글이다. 출처나 강조할 문장을 담는다." />
    </Columns>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Layout)를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[Notion 블록:지원 블록]]
/** 넓은 창에서는 열을 가로로 나란히 놓고 너비를 똑같이 나눈다 */
export const Wide: Story = {
  args: { layout: 'wide' },
  render: (args) => (
    <Columns layout={args.layout}>
      <SampleColumn text="왼쪽" />
      <SampleColumn text="오른쪽" />
    </Columns>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // Columns 슬롯의 바로 아래 자식이 열이다.
    const slot = canvas.getByText('왼쪽').closest('.gap-spacing-3xl');
    const left = slot?.children[0];
    const right = slot?.children[1];
    await step('오른쪽 열이 왼쪽 열 오른쪽에 같은 높이로 온다', async () => {
      const leftBox = left?.getBoundingClientRect();
      const rightBox = right?.getBoundingClientRect();
      await expect(rightBox?.left).toBeGreaterThan(leftBox?.right ?? 0);
      await expect(rightBox?.top).toBe(leftBox?.top);
    });
    await step('두 열의 너비가 같다', async () => {
      await expect(left?.getBoundingClientRect().width).toBe(right?.getBoundingClientRect().width);
    });
  },
};

// @codocs [[Notion 블록:지원 블록]]
/** 좁은 창에서는 왼쪽 열 다음 오른쪽 열 차례로 위에서 아래로 쌓는다 */
export const Narrow: Story = {
  args: { layout: 'narrow' },
  render: (args) => (
    <Columns layout={args.layout}>
      <SampleColumn text="왼쪽" />
      <SampleColumn text="오른쪽" />
    </Columns>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByText('왼쪽').getBoundingClientRect();
    const second = canvas.getByText('오른쪽').getBoundingClientRect();
    await step('오른쪽 열이 왼쪽 열 아래에 온다', async () => {
      await expect(second.top).toBeGreaterThan(first.bottom);
      await expect(second.left).toBe(first.left);
    });
  },
};
