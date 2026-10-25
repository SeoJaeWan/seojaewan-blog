import type { Meta, StoryObj } from '@storybook/react-vite';

import { ShellSurface } from './shell-surface';

// 피그마 ShellSurface의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/ShellSurface',
  // 높이·너비가 짝수라 0.5px 위치를 피하려고 padded로 둔다.
  parameters: { layout: 'padded' },
  args: { material: 'acrylic', device: 'desktop' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  // 컴포넌트의 Content 슬롯은 언제나 비어 있다.
  render: (args) => <ShellSurface material={args.material} device={args.device} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
