import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuItem } from '../menu-item/menu-item';
import { MenuSeparator } from '../menu-separator/menu-separator';
import { Flyout } from './flyout';

// 피그마 Flyout의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

type FigmaArgs = {
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Flyout',
  args: { material: 'acrylic' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // Content 슬롯에는 피그마 슬롯 기본 내용과 같은 메뉴 항목과 구분선을 넣는다.
  // Flyout은 너비가 없어 내용에 맞추므로(HUG) 감싸지 않는다. 피그마처럼 메뉴 항목이 메뉴 너비(size/menu/width)를 갖고
  // 구분선은 그 너비를 채운다.
  render: (args) => (
    <Flyout material={args.material}>
      <MenuItem
        standalone
        label="열기"
        icon="icons/ic_fluent_open_20_regular.svg"
        className="w-size-menu-width"
      />
      <MenuItem
        standalone
        label="새 창에서 열기"
        icon="icons/ic_fluent_window_20_regular.svg"
        className="w-size-menu-width"
      />
      <MenuSeparator className="w-full" />
      <MenuItem
        standalone
        label="이름 바꾸기"
        icon="icons/ic_fluent_rename_20_regular.svg"
        shortcut="F2"
        className="w-size-menu-width"
      />
      <MenuItem
        standalone
        label="삭제"
        icon="icons/ic_fluent_delete_20_regular.svg"
        shortcut="Delete"
        className="w-size-menu-width"
      />
    </Flyout>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};
