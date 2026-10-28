import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toggle } from './toggle';

const meta = {
  title: 'Components/Toggle',
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 피그마 State 변형(Expanded/Collapsed)을 isExpanded로 옮긴다. 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  // Content 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 100만 칠 없는 빈 내용으로 둔다.
  render: ({ state }: { state: 'expanded' | 'collapsed' }) => (
    <div className="w-720">
      <Toggle isExpanded={state === 'expanded'}>
        <div style={{ height: 100 }} />
      </Toggle>
    </div>
  ),
} satisfies Meta<{ state: 'expanded' | 'collapsed' }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
export const Parity: Story = {
  args: { state: 'expanded' },
};
