import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toc } from './toc';

type ParityArgs = {
  state: 'expanded' | 'collapsed';
};

const meta = {
  title: 'Components/Toc',
  args: { state: 'expanded' },
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 컴포넌트의 Items 슬롯은 언제나 비어 있으므로, 피그마 원본 크기(220×100 슬롯)만 칠 없는 빈 내용으로 채운다.
  render: (args) => (
    <Toc state={args.state} style={{ width: 220 }}>
      <div className="w-full shrink-0" style={{ height: 100 }} />
    </Toc>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(State)를 args 하나로 고른다.
export const Parity: Story = {};
