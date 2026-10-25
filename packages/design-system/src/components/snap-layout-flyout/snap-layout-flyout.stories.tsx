import type { Meta, StoryObj } from '@storybook/react-vite';

import { SnapLayoutFlyout } from './snap-layout-flyout';

const meta = {
  title: 'Components/SnapLayoutFlyout',
  // 높이가 짝수가 아닐 수 있어 0.5px 위치를 피하려고 padded로 둔다.
  parameters: { layout: 'padded' },
  render: () => <SnapLayoutFlyout />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 그린다.
export const Parity: Story = {};
