import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuZoomItem } from './menu-zoom-item';

const meta = {
  title: 'Components/MenuZoomItem',
  component: MenuZoomItem,
  args: { value: '100%' },
  // 메뉴 안에서만 쓰는 줄이다. 감싸는 요소는 크기를 더하지 않는다.
  render: (args) => (
    <div role="menu" aria-label="메뉴">
      <MenuZoomItem {...args} />
    </div>
  ),
} satisfies Meta<typeof MenuZoomItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 `default` 하나를 args 없이 그린다. 부모가 크기를 정하지만 코드 루트가 피그마 너비(240)를 갖는다.
export const Figma: Story = {};
