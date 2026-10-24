import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tooltip } from './tooltip';

// 피그마 Tooltip의 변형 속성 값이다(정규화한 이름). Type=Balloon은 Material=Solid만 있다.
const TYPES = ['default', 'balloon'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;
// 피그마 글자 속성의 기본값이다([[피그마 연동:스토리 규칙]]).
const texts = {
  default: '도움말',
  balloon: '메시지 내용',
} as const satisfies Record<(typeof TYPES)[number], string>;

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
  render: (args) => <Tooltip type={args.type} material={args.material} text={texts[args.type]} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
