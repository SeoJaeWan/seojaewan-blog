import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  MENU_PLACEMENT_ARG_TYPES,
  MenuStory,
  menuStoryA11y,
  type MenuStoryPlacement,
} from '@/shared/components/menu-popup/story-menu';

import { menuMultiple } from './story-data';

type FigmaArgs = {
  placement: MenuStoryPlacement;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 `Placement` 변형은 `placement` arg로 메뉴를 기준 자리의 아래·위로 연다.
// 위로 열면 단추 줄이 맨 아래로 간다. 무대가 여백을 두므로 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Menu/Multiple',
  parameters: { layout: 'fullscreen', a11y: menuStoryA11y },
  args: { placement: 'below' },
  argTypes: MENU_PLACEMENT_ARG_TYPES,
  render: (args) => <MenuStory items={menuMultiple} placement={args.placement} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
