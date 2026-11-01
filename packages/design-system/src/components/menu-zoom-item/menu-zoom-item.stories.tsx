import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { MenuZoomItem } from './menu-zoom-item';

const meta = {
  title: 'Components/MenuZoomItem',
  component: MenuZoomItem,
  args: { value: '100%' },
  // 메뉴 안에서만 쓰는 줄이라 너비는 부모가 정한다. 감싸는 요소가 메뉴 폭을 준다.
  render: (args) => (
    <div role="menu" aria-label="메뉴" className="w-size-menu-width">
      <MenuZoomItem {...args} />
    </div>
  ),
} satisfies Meta<typeof MenuZoomItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 `default` 하나를 args 없이 그린다. 부모가 크기를 정한다.
export const Figma: Story = {};

// @codocs [[Chrome:확대/축소]]
/** 배율 글자를 보여 주고 −·+ 버튼이 콜백을 부른다 */
export const Default: Story = {
  args: { value: '110%', onZoomOut: fn(), onZoomIn: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('110%')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('menuitem', { name: '축소' }));
    await userEvent.click(canvas.getByRole('menuitem', { name: '확대' }));

    await expect(args.onZoomOut).toHaveBeenCalledTimes(1);
    await expect(args.onZoomIn).toHaveBeenCalledTimes(1);
  },
};

// @codocs [[Chrome:확대/축소]]
/** 끝 단계에서는 해당 버튼이 비활성이다 */
export const AtLimit: Story = {
  args: { value: '200%', isZoomInDisabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('menuitem', { name: '확대' })).toBeDisabled();
    await expect(canvas.getByRole('menuitem', { name: '축소' })).toBeEnabled();
  },
};
