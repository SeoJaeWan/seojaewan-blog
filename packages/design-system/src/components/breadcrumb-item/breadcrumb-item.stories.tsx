import type { Meta, StoryObj } from '@storybook/react-vite';

import { BreadcrumbItem } from './breadcrumb-item';

// 피그마 BreadcrumbItem의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'pressed'] as const;

type ParityArgs = {
  current: boolean;
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/BreadcrumbItem',
  args: { current: false, state: 'rest' },
  argTypes: {
    current: { control: 'boolean' },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => <BreadcrumbItem current={args.current} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};
