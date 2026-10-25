import type { Meta, StoryObj } from '@storybook/react-vite';

import { MenuStory } from './menu-story';
import { MENU_RECYCLE_BIN } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
const meta = {
  title: 'Patterns/Menu/RecycleBin',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  render: () => <MenuStory items={MENU_RECYCLE_BIN} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
