import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavigationPane } from './navigation-pane';

const meta = {
  title: 'Components/NavigationPane',
  // 컴포넌트의 items 슬롯은 언제나 비어 있으므로, 피그마 원본 크기(248×192 슬롯)만 칠 없는 빈 내용으로 채운다.
  render: () => (
    <NavigationPane style={{ width: 248 }}>
      <div className="w-full shrink-0" style={{ height: 192 }} />
    </NavigationPane>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 default 하나를 그린다.
export const Parity: Story = {};
