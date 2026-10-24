import type { Meta, StoryObj } from '@storybook/react-vite';

import { Scrollbar } from './scrollbar';

// 피그마 Scrollbar의 변형 속성 값이다(정규화한 이름).
const ORIENTATIONS = ['vertical', 'horizontal'] as const;
const STATES = ['rest', 'expanded'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  orientation: (typeof ORIENTATIONS)[number];
  state: (typeof STATES)[number];
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Scrollbar',
  args: { orientation: 'vertical', state: 'rest', material: 'acrylic' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ORIENTATIONS },
    state: { control: 'inline-radio', options: STATES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 길이는 쓰는 곳이 정하므로 피그마 원본 길이(size/200)를 준다.
  render: (args) => (
    <Scrollbar
      orientation={args.orientation}
      state={args.state}
      material={args.material}
      className={args.orientation === 'vertical' ? 'h-200' : 'w-200'}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
