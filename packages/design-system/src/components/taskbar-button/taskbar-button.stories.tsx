import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarButton } from './taskbar-button';

// 피그마 TaskbarButton의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const INDICATORS = ['none', 'running', 'active'] as const;
const STATES = ['rest', 'hover', 'pressed'] as const;

type ParityArgs = {
  indicator: (typeof INDICATORS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/TaskbarButton',
  args: { indicator: 'none', state: 'rest' },
  argTypes: {
    indicator: { control: 'inline-radio', options: INDICATORS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => <TaskbarButton indicator={args.indicator} label="앱 이름" />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};
