import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tooltip } from './tooltip';

// 피그마 Tooltip의 변형 속성 값이다(정규화한 이름). Type=Balloon은 Material=Solid만 있다.
const TYPES = ['default', 'balloon'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  type: (typeof TYPES)[number];
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Tooltip',
  args: { type: 'default', material: 'acrylic' },
  argTypes: {
    type: { control: 'inline-radio', options: TYPES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 글자는 피그마 Text·Message 속성의 기본값이다.
  render: (args) =>
    args.type === 'balloon' ? (
      <Tooltip type="balloon" message="메시지 내용" />
    ) : (
      <Tooltip material={args.material} text="도움말" />
    ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
