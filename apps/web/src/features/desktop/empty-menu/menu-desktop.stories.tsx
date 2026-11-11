import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import {
  MENU_PLACEMENT_ARG_TYPES,
  MenuStory,
  menuStoryA11y,
  type MenuStoryPlacement,
} from '@/shared/components/menu-popup/story-menu';
import { expectSubmenuOnHover } from '@/shared/components/menu-popup/story-menu-play';

import { menuDesktop, menuDesktopLive } from './story-data';

type FigmaArgs = {
  isPaste: boolean;
  placement: MenuStoryPlacement;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 `Paste` 변형은 `isPaste` arg로 붙여넣을 것이 있는지(단추 줄의 붙여넣기)를,
// `Placement` 변형은 `placement` arg로 메뉴를 여는 쪽을 고른다. 하위 메뉴는 닫은 모양이다.
// 무대가 여백을 두므로 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Menu/Desktop',
  parameters: { layout: 'fullscreen', a11y: menuStoryA11y },
  args: { isPaste: false, placement: 'below' },
  argTypes: { isPaste: { control: 'boolean' }, ...MENU_PLACEMENT_ARG_TYPES },
  render: (args) => <MenuStory items={menuDesktop(args.isPaste)} placement={args.placement} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// 피그마 조립 설명의 `@runtime 보기에/정렬 기준에 마우스를 올리면 Menu가 열린다` 줄을 실제 메뉴로 확인한다.
// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
export const OpenSubmenus: Story = {
  render: () => <MenuStory items={menuDesktopLive} placement="below" />,
  play: async ({ step }) => {
    const user = userEvent.setup();

    await step('보기에 마우스를 올리면 아이콘 크기와 자동 정렬 항목의 Menu가 열린다', async () => {
      await expectSubmenuOnHover(user, '보기', [
        '큰 아이콘',
        '보통 아이콘',
        '작은 아이콘',
        '아이콘 자동 정렬',
      ]);
    });

    await step('정렬 기준에 마우스를 올리면 이름·항목 유형·수정한 날짜 Menu가 열린다', async () => {
      await expectSubmenuOnHover(user, '정렬 기준', ['이름', '항목 유형', '수정한 날짜']);
    });
  },
};

/**
 * 열린 하위 메뉴(두 번째 메뉴)의 첫 항목 글자를 돌려준다. 하위 메뉴가 없으면 null이다.
 * @returns 첫 항목 글자
 */
function openSubmenuFirstLabel(): string | null {
  const submenu = screen.queryAllByRole('menu')[1];
  return submenu?.querySelector('[role^="menuitem"]')?.textContent.trim() ?? null;
}

// 하위 메뉴는 마우스가 항목에 머물러야(400ms) 바뀌고, 옛 하위 메뉴는 새 하위 메뉴가 열리는 순간까지 남는다.
// @codocs [[디자인 시스템:팝업]]
export const SubmenuHoverDelay: Story = {
  render: () => <MenuStory items={menuDesktopLive} placement="below" />,
  play: async ({ step }) => {
    const user = userEvent.setup();

    await step('보기에 머물면 보기 하위 메뉴가 열린다', async () => {
      await user.hover(await screen.findByRole('menuitem', { name: '보기' }));
      await waitFor(async () => {
        await expect(openSubmenuFirstLabel()).toMatch(/^큰 아이콘/u);
      });
    });

    await step(
      '정렬 기준에 올린 직후에는 보기 하위 메뉴가 그대로이고, 머물면 정렬 기준 하위 메뉴로 바뀐다',
      async () => {
        await user.hover(screen.getByRole('menuitem', { name: '정렬 기준' }));
        await expect(openSubmenuFirstLabel()).toMatch(/^큰 아이콘/u);
        await waitFor(async () => {
          await expect(openSubmenuFirstLabel()).toBe('이름');
        });
      },
    );

    await step('일반 항목(새로 고침)에 머물면 열린 하위 메뉴가 닫힌다', async () => {
      await user.hover(screen.getByRole('menuitem', { name: '새로 고침' }));
      await expect(openSubmenuFirstLabel()).toBe('이름');
      await waitFor(async () => {
        await expect(openSubmenuFirstLabel()).toBeNull();
      });
    });

    await step('하위 메뉴 항목을 누르면 기다리지 않고 바로 연다', async () => {
      await user.click(screen.getByRole('menuitem', { name: '보기' }));
      // 머무는 시간(400ms)보다 짧게만 기다려, 마우스를 올려서가 아니라 눌러서 열렸는지 본다.
      await waitFor(
        async () => {
          await expect(openSubmenuFirstLabel()).toMatch(/^큰 아이콘/u);
        },
        { timeout: 200 },
      );
    });
  },
};
