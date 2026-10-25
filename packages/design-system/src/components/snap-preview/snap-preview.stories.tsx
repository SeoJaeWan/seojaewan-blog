import type { Meta, StoryObj } from '@storybook/react-vite';

import { SnapPreview } from './snap-preview';

const meta = {
  title: 'Components/SnapPreview',
  // 부모가 크기를 정하는 컴포넌트라 코드에 크기가 없다. 피그마 원본 크기(952x1016)를 className으로 준다.
  render: () => <SnapPreview className="h-1016 w-952" />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형이 하나뿐이라 args 없이 그린다.
export const Parity: Story = {};
