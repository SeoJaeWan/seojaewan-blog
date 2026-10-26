import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuStory } from '@/shared/stories/menu-story/menu-story';

import { menuExplorerEmpty } from './story-data';

// 피그마 Menu/ExplorerEmpty의 변형 속성 값이다(정규화한 이름).
const SUBMENUS = ['none', 'view', 'sort'] as const;

type ParityArgs = {
  submenu: (typeof SUBMENUS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. Submenu 변형은 펼친 하위 메뉴를 고른다.
// 펼친 하위 메뉴는 메뉴 밖으로 뜨는 팝업이라 캡처 대상은 메뉴 바탕이고, 하위 메뉴는 그 밖으로 나온 자식으로 찍힌다.
const meta = {
  title: 'Patterns/Menu/ExplorerEmpty',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { submenu: 'none' },
  argTypes: {
    submenu: { control: 'inline-radio', options: SUBMENUS },
  },
  render: (args) => <MenuStory items={menuExplorerEmpty(args.submenu)} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
