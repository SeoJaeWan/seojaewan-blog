import type { Meta, StoryObj } from '@storybook/react-vite';

import { CaptionButton } from './caption-button';

// 피그마 CaptionButton의 변형 속성 값이다(정규화한 이름).
const KINDS = ['default', 'close'] as const;
const STATES = ['rest', 'hover', 'pressed', 'inactive'] as const;

type ParityArgs = {
  kind: (typeof KINDS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/CaptionButton',
  args: { kind: 'default', state: 'rest' },
  argTypes: {
    kind: { control: 'inline-radio', options: KINDS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <CaptionButton
      kind={args.kind}
      label={args.kind === 'close' ? '닫기' : '최소화'}
      inactive={args.state === 'inactive'}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현하고, Inactive는 args로 고른다.
export const Parity: Story = {};
