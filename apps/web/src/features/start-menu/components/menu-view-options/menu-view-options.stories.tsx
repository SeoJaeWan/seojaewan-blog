import type { Meta, StoryObj } from '@storybook/react-vite';

import { menuViewOptions } from '@/features/start-menu/stories/view-options-menu-data/view-options-menu-data';
import { MenuStory } from '@/shared/stories/menu-story/menu-story';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
// 피그마는 Menu 너비를 104로 줄이고 항목이 그 너비를 채운다.
const meta = {
  title: 'Patterns/Menu/ViewOptions',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  render: () => <MenuStory items={menuViewOptions} className="w-104" itemClassName="w-full" />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
