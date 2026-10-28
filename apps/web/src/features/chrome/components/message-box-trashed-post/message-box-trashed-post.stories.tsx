import type { Meta, StoryObj } from '@storybook/react-vite';

import { MessageBoxTrashedPost } from './message-box-trashed-post';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
const meta = {
  title: 'Patterns/MessageBox/TrashedPost',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  // 그림자가 상자 왼쪽으로 64px까지 나가므로 padded 여백에 48px을 더 두어 화면 밖으로 잘리지 않게 하고,
  // 상자(피그마 노드)를 캡처 대상으로 표시한다.
  parameters: { layout: 'padded' },
  render: () => (
    <div className="p-48">
      <div data-parity-target className="flex">
        <MessageBoxTrashedPost />
      </div>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
