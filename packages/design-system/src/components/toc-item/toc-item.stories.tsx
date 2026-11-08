import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TocItem } from './toc-item';

// 피그마 TocItem Level 변형 값이다(정규화한 이름).
const LEVELS = ['1', '2', '3'] as const;

type FigmaArgs = {
  isActive: boolean;
  level: (typeof LEVELS)[number];
};

const meta = {
  title: 'Components/TocItem',
  args: { isActive: false, level: '1' },
  argTypes: {
    isActive: { control: 'boolean' },
    level: { control: 'inline-radio', options: LEVELS },
  },
  render: (args) => <TocItem isActive={args.isActive} level={Number(args.level) as 1 | 2 | 3} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Active, Level)를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
/** 기본은 활성이 아니다 */
export const Default: Story = {
  render: () => <TocItem />,
  play: async ({ canvasElement, step }) => {
    await step('활성이 아니면 aria-current가 없다', async () => {
      const label = within(canvasElement).getByText('목차 항목');
      await expect(label.parentElement).not.toHaveAttribute('aria-current');
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** isActive이면 aria-current가 붙는다 */
export const Active: Story = {
  render: () => <TocItem isActive label="소개" />,
  play: async ({ canvasElement, step }) => {
    await step('isActive이면 aria-current가 location이다', async () => {
      const label = within(canvasElement).getByText('소개');
      await expect(label.parentElement).toHaveAttribute('aria-current', 'location');
    });
  },
};
