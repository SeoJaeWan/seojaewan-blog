import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Menu } from './menu';

const meta = {
  title: 'Components/Menu',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

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
