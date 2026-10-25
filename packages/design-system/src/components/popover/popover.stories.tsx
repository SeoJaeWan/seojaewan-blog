import type { Meta, StoryObj } from '@storybook/react-vite';

import { Popover } from './popover';

// 피그마 Popover의 변형 속성 값이다(정규화한 이름).
const PLACEMENTS = [
  'bottom-start',
  'bottom-center',
  'bottom-end',
  'top-center',
  'top-end',
  'right-start',
] as const;
const STATES = ['closed', 'open'] as const;

type ParityArgs = {
  placement: (typeof PLACEMENTS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/Popover',
  // 위·오른쪽으로 뜨는 팝업이 화면 밖으로 나가지 않도록 가운데에 둔다.
  parameters: { layout: 'centered' },
  args: { placement: 'bottom-start', state: 'closed' },
  argTypes: {
    placement: { control: 'inline-radio', options: PLACEMENTS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    // 컴포넌트는 슬롯을 채우지 않는다. 피그마는 빈 Trigger 슬롯을 120×32의 칠 없는 자리로 그리고, 빈 Popup 슬롯은
    // 트리거 쪽 바깥에 붙인 두께 size/4의 자리(위·아래는 트리거 너비 × 4, 오른쪽은 4 × 트리거 높이)로 그린다. 칠 없는 빈 자리를 둔다.
    // 코드의 팝업 상자는 이 자리에 간격(spacing/4)만큼 띄워 놓이므로 그림에는 나오지 않는다.
    <Popover
      placement={args.placement}
      open={args.state === 'open'}
      trigger={<div className="h-32 w-120" />}
      popup={<div className={args.placement === 'right-start' ? 'h-32 w-4' : 'h-4 w-120'} />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
