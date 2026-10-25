import type { Meta, StoryObj } from '@storybook/react-vite';

import { CaptionButtonGroup } from './caption-button-group';

// 피그마 CaptionButtonGroup의 변형 속성 값이다(정규화한 이름).
const PLACEMENTS = ['normal', 'maximized', 'snapped'] as const;
const STATES = ['active', 'inactive'] as const;

type ParityArgs = {
  placement: (typeof PLACEMENTS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/CaptionButtonGroup',
  args: { placement: 'normal', state: 'active' },
  argTypes: {
    placement: { control: 'inline-radio', options: PLACEMENTS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <CaptionButtonGroup placement={args.placement} inactive={args.state === 'inactive'} />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
