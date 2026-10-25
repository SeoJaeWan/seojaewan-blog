import type { Meta, StoryObj } from '@storybook/react-vite';

import { TocItem } from './toc-item';

type ParityArgs = {
  active: boolean;
};

const meta = {
  title: 'Components/TocItem',
  args: { active: false },
  argTypes: {
    active: { control: 'boolean' },
  },
  render: (args) => <TocItem active={args.active} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Active)를 args 하나로 고른다.
export const Parity: Story = {};
