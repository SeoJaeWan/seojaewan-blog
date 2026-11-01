import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Menu } from './menu';

const meta = {
  title: 'Components/Menu',
  render: () => (
    // 컴포넌트의 Content 슬롯은 언제나 비어 있다. 피그마는 빈 슬롯을 높이 16px로 그리므로 같은 높이의 빈 자리를 둔다.
    <Menu>
      <div className="h-16" />
    </Menu>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 Menu는 변형이 하나(default)라 args가 없다.
export const Parity: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 항목을 children 자리(Flyout Content 슬롯)에 그린다 */
export const Default: Story = {
  render: () => (
    <Menu role="menu" aria-label="메뉴">
      <div role="menuitem" tabIndex={-1}>
        메뉴 항목
      </div>
    </Menu>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('menu', { name: '메뉴' })).toContainElement(
      canvas.getByRole('menuitem', { name: '메뉴 항목' }),
    );
  },
};
