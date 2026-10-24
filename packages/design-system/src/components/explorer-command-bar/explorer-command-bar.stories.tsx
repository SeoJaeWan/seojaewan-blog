import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerCommandBar } from './explorer-command-bar';

const meta = {
  title: 'Components/ExplorerCommandBar',
  // 부모가 너비를 정하는 컴포넌트라 피그마 원본 너비 798로 감싼다.
  // Commands 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 32만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <div className="w-798">
      <ExplorerCommandBar>
        <div className="w-full" style={{ height: 32 }} />
      </ExplorerCommandBar>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나뿐인 변형을 그린다.
export const Parity: Story = {};
