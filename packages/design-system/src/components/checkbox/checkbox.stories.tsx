import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Checkbox } from './checkbox';

type ParityArgs = {
  checked: boolean;
};

const meta = {
  title: 'Components/Checkbox',
  args: { checked: false },
  argTypes: {
    checked: { control: 'boolean' },
  },
  render: (args) => <Checkbox checked={args.checked} label="할 일" />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다(`Checked=True` → `checked: true`).
export const Parity: Story = {};

// @codocs [[Notion 블록:지원 블록]]
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 블록:지원 블록]]
    await step('기본은 체크되지 않은 읽기 전용 표시다', async () => {
      const box = within(canvasElement).getByRole('checkbox', { name: '할 일' });
      await expect(box).toHaveAttribute('aria-checked', 'false');
      await expect(box).toHaveAttribute('aria-readonly', 'true');
    });
  },
};

// @codocs [[Notion 블록:지원 블록]]
export const Checked: Story = {
  args: { checked: true },
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 블록:지원 블록]]
    await step('checked면 체크된 표시다', async () => {
      await expect(within(canvasElement).getByRole('checkbox', { name: '할 일' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  },
};
