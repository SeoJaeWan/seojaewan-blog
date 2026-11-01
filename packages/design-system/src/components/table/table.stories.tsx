import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TableCell } from '../table-cell/table-cell';
import { Table } from './table';

const meta = {
  title: 'Components/Table',
  component: Table,
  // 가운데 배치는 선 위치를 반 픽셀로 만들어 흐려지므로 위쪽 왼쪽에 둔다.
  parameters: { layout: 'padded' },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다. 슬롯은 비어 있고, 피그마 빈 슬롯의 높이 100을 빈 행으로 맞춘다.
  render: (args) => (
    <div className="w-720">
      <Table {...args} data-parity-target>
        <tr style={{ height: 100 }} />
      </Table>
    </div>
  ),
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나(`default`)라 args가 없다.
export const Parity: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 행과 칸을 children으로 받아 table로 그린다 */
export const Default: Story = {
  render: () => (
    <Table aria-label="비교">
      <tr>
        <TableCell type="header" scope="col">
          이름
        </TableCell>
      </tr>
      <tr>
        <TableCell>값</TableCell>
      </tr>
    </Table>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('행과 칸을 children으로 받는다', async () => {
      await expect(canvas.getByRole('table', { name: '비교' })).toBeInTheDocument();
      await expect(canvas.getAllByRole('row')).toHaveLength(2);
      await expect(canvas.getByRole('columnheader')).toHaveTextContent('이름');
      await expect(canvas.getByRole('cell')).toHaveTextContent('값');
    });
  },
};
