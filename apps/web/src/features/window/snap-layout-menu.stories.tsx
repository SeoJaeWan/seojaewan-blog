import type { Meta, StoryObj } from '@storybook/react-vite';

import { SnapLayoutMenu } from './snap-layout-menu';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립은 선택지를 연 모습 하나라 열린 채로 그린다.
// 선택지는 버튼 아래 가운데로 버튼보다 넓게 열리므로 둘레에 자리를 두고, 버튼 자리(피그마 노드)를 캡처 대상으로 표시한다.
const meta = {
  title: 'Patterns/Window/SnapLayoutMenu',
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex h-120 w-480 justify-center">
      <div data-parity-target className="flex h-fit">
        <SnapLayoutMenu open />
      </div>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
