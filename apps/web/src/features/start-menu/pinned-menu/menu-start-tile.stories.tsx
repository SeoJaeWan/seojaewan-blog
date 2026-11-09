import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuStory, menuStoryA11y } from '@/shared/components/menu-popup/story-menu';

import { menuStartTile, type StartTilePosition } from './story-data';

// 피그마 Menu/StartTile의 변형 속성 값이다(정규화한 이름).
const POSITIONS = ['first', 'second', 'middle', 'last'] as const;

type FigmaArgs = {
  position: StartTilePosition;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. Position은 우클릭한 고정 칸의 위치이고, 위치마다 보이는 이동 메뉴가 다르다.
const meta = {
  title: 'Patterns/Menu/StartTile',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded', a11y: menuStoryA11y },
  args: { position: 'first' },
  argTypes: {
    position: { control: 'inline-radio', options: POSITIONS },
  },
  render: (args) => <MenuStory items={menuStartTile(args.position)} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
