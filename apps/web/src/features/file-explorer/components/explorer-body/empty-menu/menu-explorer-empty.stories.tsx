import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent } from 'storybook/test';

import {
  MENU_PLACEMENT_ARG_TYPES,
  MenuStory,
  menuStoryA11y,
  type MenuStoryPlacement,
} from '@/shared/components/menu-popup/story-menu';
import { expectSubmenuOnHover } from '@/shared/components/menu-popup/story-menu-play';

import { menuExplorerEmpty, menuExplorerEmptyLive } from './story-data';

type FigmaArgs = {
  isPaste: boolean;
  placement: MenuStoryPlacement;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 `Paste` 변형은 `isPaste` arg로 붙여넣을 것이 있는지(단추 줄의 붙여넣기)를,
// `Placement` 변형은 `placement` arg로 메뉴를 여는 쪽을 고른다. 하위 메뉴는 닫은 모양이다.
// 무대가 여백을 두므로 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Menu/ExplorerEmpty',
  parameters: { layout: 'fullscreen', a11y: menuStoryA11y },
  args: { isPaste: false, placement: 'below' },
  argTypes: { isPaste: { control: 'boolean' }, ...MENU_PLACEMENT_ARG_TYPES },
  render: (args) => (
    <MenuStory items={menuExplorerEmpty(args.isPaste)} placement={args.placement} />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// 피그마 조립 설명의 `@runtime 보기에/정렬 기준에 마우스를 올리면 Menu가 열린다` 줄을 실제 메뉴로 확인한다.
// @codocs [[파일 탐색기:우클릭 메뉴]]
export const OpenSubmenus: Story = {
  render: () => <MenuStory items={menuExplorerEmptyLive} placement="below" />,
  play: async ({ step }) => {
    const user = userEvent.setup();

    await step('보기에 마우스를 올리면 큰 아이콘·보통 아이콘·자세히 Menu가 열린다', async () => {
      await expectSubmenuOnHover(user, '보기', ['큰 아이콘', '보통 아이콘', '자세히']);
    });

    await step('정렬 기준에 마우스를 올리면 기준과 오름차순·내림차순 Menu가 열린다', async () => {
      await expectSubmenuOnHover(user, '정렬 기준', [
        '이름',
        '수정한 날짜',
        '유형',
        '오름차순',
        '내림차순',
      ]);
    });
  },
};
