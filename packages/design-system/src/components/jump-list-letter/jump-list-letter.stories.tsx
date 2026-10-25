import type { Meta, StoryObj } from '@storybook/react-vite';

import { JumpListLetter } from './jump-list-letter';

// 피그마 JumpListLetter의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'pressed', 'focused', 'disabled'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  label: string;
};

const meta = {
  title: 'Components/JumpListLetter',
  args: { state: 'rest', label: '글자' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    label: { control: 'text' },
  },
  render: (args) => <JumpListLetter label={args.label} disabled={args.state === 'disabled'} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};
