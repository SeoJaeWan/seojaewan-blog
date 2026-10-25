import type { Meta, StoryObj } from '@storybook/react-vite';

import { IconButton } from './icon-button';

// 피그마 IconButton의 변형 속성 값이다(정규화한 이름).
const STYLES = ['standard', 'subtle', 'chrome'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled', 'focused'] as const;

type ParityArgs = {
  style: (typeof STYLES)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/IconButton',
  args: { style: 'standard', state: 'rest' },
  argTypes: {
    style: { control: 'inline-radio', options: STYLES },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <IconButton variant={args.style} label="더 보기" disabled={args.state === 'disabled'} />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};
