import type { Meta, StoryObj } from '@storybook/react-vite';

import { SnapLayoutOption } from './snap-layout-option';

// 피그마 SnapLayoutOption의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['half', 'twothirds', 'halfquarter', 'quad'] as const;

type ParityArgs = {
  layout: (typeof LAYOUTS)[number];
};

const meta = {
  title: 'Components/SnapLayoutOption',
  parameters: { layout: 'padded' },
  args: { layout: 'half' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  render: (args) => <SnapLayoutOption layout={args.layout} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
