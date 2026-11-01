import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TableCell } from '../table-cell/table-cell';
import { Table } from './table';

const meta = {
  title: 'Components/Table',
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

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
