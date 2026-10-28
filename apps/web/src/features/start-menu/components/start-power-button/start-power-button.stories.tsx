import type { Meta, StoryObj } from '@storybook/react-vite';

import { menuPower } from '@/features/start-menu/stories/power-menu-data/power-menu-data';

import { StartPowerButton } from './start-power-button';

// 피그마 Start/PowerButton의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 메뉴는 버튼 위에 열리므로 위쪽에 메뉴가 들어갈 자리를 두고,
// 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다. 메뉴는 그 둘레에 함께 찍힌다.
const meta = {
  title: 'Patterns/Start/PowerButton',
  parameters: { layout: 'padded' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <div className="flex h-120 w-320 items-end justify-end">
      <div data-parity-target className="flex">
        <StartPowerButton open={args.state === 'open'} menuItems={menuPower} />
      </div>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
