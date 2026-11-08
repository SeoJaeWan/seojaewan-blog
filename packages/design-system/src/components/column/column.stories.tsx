import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import columnExport from '../../../figma/components/column/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Quote } from '../quote/quote';
import { Column } from './column';

const meta = {
  title: 'Components/Column',
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 너비(@sample-size width)로 감싼다.
  decorators: [figmaFrame(columnExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Content` 슬롯 기본 내용(Quote 하나)을 넣은 모습이다.
export const Figma: Story = {
  render: () => (
    <Column>
      <Quote>
        <p>인용 블록의 글이다. 출처나 강조할 문장을 담는다.</p>
      </Quote>
    </Column>
  ),
};

// @codocs [[Notion 블록:지원 블록]]
/** 블록 여럿을 위에서 아래로 차례로 쌓고, 각 블록이 열 너비를 채운다 */
export const Stacked: Story = {
  render: () => (
    <Column>
      <Quote>
        <p>첫 블록</p>
      </Quote>
      <Quote>
        <p>둘째 블록</p>
      </Quote>
    </Column>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByText('첫 블록').parentElement?.parentElement;
    const second = canvas.getByText('둘째 블록').parentElement?.parentElement;
    const slot = first?.parentElement;
    await step('둘째 블록이 첫 블록 아래에 온다', async () => {
      await expect(second?.getBoundingClientRect().top).toBeGreaterThan(
        first?.getBoundingClientRect().bottom ?? 0,
      );
    });
    await step('블록이 열 너비를 채운다', async () => {
      await expect(first?.getBoundingClientRect().width).toBe(slot?.getBoundingClientRect().width);
    });
  },
};
