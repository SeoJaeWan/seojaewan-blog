import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flyout } from './flyout';

// 피그마 Flyout의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;
const PADDINGS = ['compact', 'default'] as const;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
  padding: (typeof PADDINGS)[number];
};

const meta = {
  title: 'Components/Flyout',
  args: { material: 'acrylic', padding: 'default' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
    padding: { control: 'inline-radio', options: PADDINGS },
  },
  render: (args) => (
    // 컴포넌트의 Content 슬롯은 언제나 비어 있다. 피그마는 빈 슬롯을 높이 16px로 그리므로 같은 높이의 빈 자리를 둔다.
    // Flyout은 너비가 없어 부모를 채운다. 피그마 미리보기 너비(320)의 부모로 감싸고, 캡처 대상은 Flyout으로 표시한다.
    <div className="w-320">
      <Flyout material={args.material} padding={args.padding} data-parity-target>
        <div className="h-16" />
      </Flyout>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
