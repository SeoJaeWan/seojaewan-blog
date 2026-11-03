import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuItem } from '../menu-item/menu-item';
import { MenuSeparator } from '../menu-separator/menu-separator';
import { Menu } from './menu';

const meta = {
  title: 'Components/Menu',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 Menu는 변형이 하나다. Flyout Content 슬롯(children)에는 피그마 슬롯 기본 내용과 같은 메뉴 항목과 구분선을 넣는다.
export const Figma: Story = {
  render: () => (
    <Menu>
      <MenuItem standalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
      <MenuItem standalone label="새 창에서 열기" icon="icons/ic_fluent_window_20_regular.svg" />
      <MenuSeparator />
      <MenuItem
        standalone
        label="이름 바꾸기"
        icon="icons/ic_fluent_rename_20_regular.svg"
        shortcut="F2"
      />
      <MenuItem
        standalone
        label="삭제"
        icon="icons/ic_fluent_delete_20_regular.svg"
        shortcut="Delete"
      />
    </Menu>
  ),
};
