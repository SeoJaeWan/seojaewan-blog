import type { Meta, StoryObj } from '@storybook/react-vite';

import { ListGroup } from './list-group';

const meta = {
  title: 'Components/ListGroup',
  args: { showHeader: true },
  // 컴포넌트의 items 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 74만 칠 없는 빈 내용으로 둔다.
  render: (args) => (
    <ListGroup showHeader={args.showHeader}>
      <div className="w-full shrink-0" style={{ height: 74 }} />
    </ListGroup>
  ),
} satisfies Meta<{ showHeader: boolean }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Parity: Story = {};
