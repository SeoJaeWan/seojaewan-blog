import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent } from 'storybook/test';

import {
  MENU_PLACEMENT_ARG_TYPES,
  MenuStory,
  menuStoryA11y,
  type MenuStoryPlacement,
} from '@/shared/components/menu-popup/story-menu';

import { menuFolder } from './story-data';

type FigmaArgs = {
  placement: MenuStoryPlacement;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 `Placement` 변형은 `placement` arg로 메뉴를 기준 자리의 아래·위로 연다.
// 위로 열면 단추 줄이 맨 아래로 간다. 무대가 여백을 두므로 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Menu/Folder',
  parameters: { layout: 'fullscreen', a11y: menuStoryA11y },
  args: { placement: 'below' },
  argTypes: MENU_PLACEMENT_ARG_TYPES,
  render: (args) => <MenuStory items={menuFolder} placement={args.placement} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/**
 * 열린 메뉴의 항목 글자를 그려진 차례대로 돌려준다.
 * @returns 항목 글자
 */
function menuItemTexts(): string[] {
  return screen.getAllByRole('menuitem').map((item) => item.textContent.trim());
}

// 단추 줄은 메뉴가 아래로 열리면 맨 위, 위로 열리면 맨 아래에 있고, 단추에 마우스를 올리면 `이름 (단축키)` 툴팁이 뜬다.
// @codocs [[바탕화면 우클릭 메뉴:아이콘]]
export const CommandBarPlacement: Story = {
  play: async ({ step }) => {
    await step('아래로 열면 단추 줄이 목록 위에 있다', async () => {
      await screen.findByRole('menu');
      await expect(menuItemTexts()).toEqual([
        '잘라내기',
        '이름 바꾸기',
        '삭제',
        '열기Enter',
        '새 창에서 열기',
        '즐겨찾기에 고정',
        '시작 화면에 고정',
      ]);
    });

    await step('단추에 마우스를 올리면 이름과 단축키 툴팁이 뜬다', async () => {
      await userEvent.hover(screen.getByRole('menuitem', { name: '이름 바꾸기' }));
      await expect(await screen.findByText('이름 바꾸기 (F2)')).toBeVisible();
    });
  },
};

// 위로 열린 메뉴(피그마 Placement=Above)는 키보드 차례도 그려진 차례(목록 다음 단추 줄)를 따른다.
// @codocs [[바탕화면 우클릭 메뉴:아이콘]]
export const CommandBarPlacementAbove: Story = {
  args: { placement: 'above' },
  play: async ({ step }) => {
    await step('위로 열면 단추 줄이 목록 아래에 있다', async () => {
      await screen.findByRole('menu');
      await expect(menuItemTexts()).toEqual([
        '열기Enter',
        '새 창에서 열기',
        '즐겨찾기에 고정',
        '시작 화면에 고정',
        '잘라내기',
        '이름 바꾸기',
        '삭제',
      ]);
    });
  },
};
