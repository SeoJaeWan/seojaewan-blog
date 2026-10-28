import type { Meta, StoryObj } from '@storybook/react-vite';

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
  render: (args) => <Checkbox checked={args.checked} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다(`Checked=True` → `checked: true`).
export const Parity: Story = {};
