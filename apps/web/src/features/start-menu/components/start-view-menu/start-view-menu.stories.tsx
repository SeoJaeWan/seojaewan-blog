import type { Meta, StoryObj } from '@storybook/react-vite';

import { MENU_VIEW_OPTIONS } from '@/features/start-menu/stories/view-options-menu-data/view-options-menu-data';

import { StartViewMenu } from './start-view-menu';

// 피그마 Start/ViewMenu의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시하고, 메뉴는 그 둘레에 함께 찍힌다.
const meta = {
  title: 'Patterns/Start/ViewMenu',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <div data-parity-target className="inline-flex">
      <StartViewMenu
        label="보기: 간단히"
        open={args.state === 'open'}
        menuItems={MENU_VIEW_OPTIONS}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
