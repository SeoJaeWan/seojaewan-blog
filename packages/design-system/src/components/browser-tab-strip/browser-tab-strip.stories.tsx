import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrowserTabStrip } from './browser-tab-strip';

const meta = {
  title: 'Components/BrowserTabStrip',
  // Tabs 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 100×100만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <BrowserTabStrip>
      <div style={{ width: 100, height: 100 }} />
    </BrowserTabStrip>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나뿐인 변형을 그린다.
export const Parity: Story = {};
