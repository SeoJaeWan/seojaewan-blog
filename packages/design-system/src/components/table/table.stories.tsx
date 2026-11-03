import type { Meta, StoryObj } from '@storybook/react-vite';

import { TableCell } from '../table-cell/table-cell';
import { Table } from './table';

const meta = {
  title: 'Components/Table',
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Rows` 슬롯 기본 내용(표 줄 3개)을 넣은 모습이다. 너비는 쓰는 곳이 정하므로 글 폭 토큰으로 준다.
export const Figma: Story = {
  render: () => (
    <div className="w-size-post-width">
      <Table aria-label="훅 비교">
        <tr>
          <TableCell type="header" scope="col">
            훅
          </TableCell>
          <TableCell type="header" scope="col">
            하는 일
          </TableCell>
        </tr>
        <tr>
          <TableCell>use</TableCell>
          <TableCell>Promise와 Context를 렌더링 중에 읽는다</TableCell>
        </tr>
        <tr>
          <TableCell>useActionState</TableCell>
          <TableCell>폼 제출 결과와 대기 상태를 다룬다</TableCell>
        </tr>
      </Table>
    </div>
  ),
};
