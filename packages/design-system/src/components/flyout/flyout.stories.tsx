import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flyout } from './flyout';

// 피그마 Flyout의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Flyout',
  args: { material: 'solid' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
  },
  render: (args) => (
    // 슬롯 안 내용은 쓰는 쪽이 정한다. 피그마 예시 글자를 그대로 둔다.
    <Flyout material={args.material}>
      <span className="type-caption text-text-fill-tertiary">콘텐츠 영역 (slot)</span>
    </Flyout>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
