import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { TileGrid } from './tile-grid';

const meta = {
  title: 'Components/TileGrid',
  render: (args) => (
    <div className="w-size-new-tab-grid-width">
      <TileGrid align={args.align}>
        <span>칸</span>
      </TileGrid>
    </div>
  ),
} satisfies Meta<{ align: 'start' | 'center' }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 칸을 tiles 슬롯(children)에 채운다 */
export const Default: Story = {
  args: { align: 'start' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('칸')).toBeInTheDocument();
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 칸을 가운데로 모은다 */
export const Center: Story = {
  args: { align: 'center' },
};
