import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { MenuStory, menuStoryA11y } from '@/shared/components/menu-popup/story-menu';
import { expectSubmenuOnHover } from '@/shared/components/menu-popup/story-menu-play';

import { menuDesktop, menuDesktopLive } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없고, 하위 메뉴는 닫은 모양이다.
const meta = {
  title: 'Patterns/Menu/Desktop',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded', a11y: menuStoryA11y },
  render: () => <MenuStory items={menuDesktop} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// 피그마 조립 설명의 `@runtime 보기에/정렬 기준에 마우스를 올리면 Menu가 열린다` 줄을 실제 메뉴로 확인한다.
// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
export const OpenSubmenus: Story = {
  render: () => <MenuStory items={menuDesktopLive} />,
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
  render: () => <MenuStory items={menuDesktopLive} />,
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
