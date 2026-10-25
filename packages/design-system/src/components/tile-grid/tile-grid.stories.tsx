import type { Meta, StoryObj } from '@storybook/react-vite';

import { TileGrid } from './tile-grid';

// 피그마 TileGrid의 변형 속성 값이다(정규화한 이름).
const ALIGNS = ['start', 'center'] as const;

type ParityArgs = {
  align: (typeof ALIGNS)[number];
};

const meta = {
  title: 'Components/TileGrid',
  args: { align: 'start' },
  argTypes: {
    align: { control: 'inline-radio', options: ALIGNS },
  },
  // 컴포넌트는 너비를 갖지 않으므로, 피그마 원본 너비 574로 감싸 그린다.
  // 컴포넌트의 tiles 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 100만 칠 없는 빈 내용으로 둔다.
  render: (args) => (
    <div className="w-574">
      <TileGrid align={args.align}>
        <div className="w-full shrink-0" style={{ height: 100 }} />
      </TileGrid>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
