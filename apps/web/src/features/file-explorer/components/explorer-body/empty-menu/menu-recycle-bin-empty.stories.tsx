import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent } from 'storybook/test';

import { MenuStory, menuStoryA11y } from '@/shared/components/menu-popup/story-menu';
import { expectSubmenuOnHover } from '@/shared/components/menu-popup/story-menu-play';

import { menuRecycleBinEmpty, menuRecycleBinEmptyLive } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없고, 하위 메뉴는 닫은 모양이다.
const meta = {
  title: 'Patterns/Menu/RecycleBinEmpty',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded', a11y: menuStoryA11y },
  render: () => <MenuStory items={menuRecycleBinEmpty} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// 피그마 조립 설명의 `@runtime 정렬 기준에 마우스를 올리면 Menu가 열린다` 줄을 실제 메뉴로 확인한다.
// @codocs [[파일 탐색기:우클릭 메뉴]]
export const OpenSubmenu: Story = {
  render: () => <MenuStory items={menuRecycleBinEmptyLive} />,
  play: async ({ step }) => {
    const user = userEvent.setup();

    await step('정렬 기준에 마우스를 올리면 기준과 오름차순·내림차순 Menu가 열린다', async () => {
      await expectSubmenuOnHover(user, '정렬 기준', [
        '이름',
        '원래 위치',
        '삭제한 날짜',
        '오름차순',
        '내림차순',
      ]);
    });
  },
};
