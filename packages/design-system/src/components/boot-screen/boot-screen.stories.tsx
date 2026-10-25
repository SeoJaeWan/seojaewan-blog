import type { Meta, StoryObj } from '@storybook/react-vite';

import { BootScreen } from './boot-screen';

// 피그마 BootScreen의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/BootScreen',
  // 화면 전체를 덮는 컴포넌트라 Storybook 기본 여백과 가운데 정렬을 쓰지 않는다.
  parameters: { layout: 'fullscreen' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => <BootScreen device={args.device} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
