import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Popover } from './popover';

const meta = {
  title: 'Components/Popover',
  // 위·오른쪽으로 뜨는 팝업이 화면 밖으로 나가지 않도록 가운데에 둔다.
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:팝업]]
/** 닫혀 있으면 트리거만 그린다 */
export const Default: Story = {
  render: () => <Popover trigger={<button type="button">열기</button>} popup={<p>팝업 내용</p>} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '열기' })).toBeInTheDocument();
    await expect(canvas.queryByText('팝업 내용')).not.toBeInTheDocument();
  },
};

// @codocs [[디자인 시스템:팝업]]
/** 열려 있으면 트리거와 함께 팝업을 그린다 */
export const Open: Story = {
  render: () => (
    <Popover open trigger={<button type="button">열기</button>} popup={<p>팝업 내용</p>} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '열기' })).toBeInTheDocument();
    await expect(canvas.getByText('팝업 내용')).toBeVisible();
  },
};
