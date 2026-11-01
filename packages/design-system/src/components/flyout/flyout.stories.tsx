import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Flyout } from './flyout';

const meta = {
  title: 'Components/Flyout',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 내용을 children 자리에 그리고, 역할과 접근성 이름 같은 div 속성을 그대로 넘긴다 */
export const Default: Story = {
  render: () => (
    <Flyout role="dialog" aria-label="정렬 기준" material="solid">
      <p>메뉴 내용</p>
    </Flyout>
  ),
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole('dialog', { name: '정렬 기준' });
    await expect(dialog).toHaveTextContent('메뉴 내용');
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 조립이 쓰지 않는 변형(Acrylic, Padding=Default)도 그린다. Solid, Padding=Default는 Default 스토리다 */
export const Acrylic: Story = {
  render: () => (
    <Flyout role="dialog" aria-label="정렬 기준" material="acrylic">
      <p>메뉴 내용</p>
    </Flyout>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: '정렬 기준' })).toHaveTextContent('메뉴 내용');
  },
};
