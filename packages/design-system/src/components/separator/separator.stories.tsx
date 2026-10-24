import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

// 피그마 Separator의 변형 속성 값이다(정규화한 이름).
const ORIENTATIONS = ['horizontal', 'vertical'] as const;

type ParityArgs = {
  orientation: (typeof ORIENTATIONS)[number];
};

const meta = {
  title: 'Components/Separator',
  // 1px 선이 가운데 정렬에서 반 픽셀 위치에 놓여 번지지 않도록 위쪽부터 놓는다.
  parameters: { layout: 'padded' },
  args: { orientation: 'horizontal' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ORIENTATIONS },
  },
  // 가로선의 너비는 쓰는 곳이 정하므로 피그마 원본 너비(size/240)를 준다.
  render: (args) => (
    <Separator
      orientation={args.orientation}
      className={args.orientation === 'horizontal' ? 'w-240' : undefined}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
