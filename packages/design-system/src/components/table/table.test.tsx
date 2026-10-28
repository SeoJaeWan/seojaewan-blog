import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableCell } from '../table-cell/table-cell';
import { Table } from './table';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Table', () => {
  it('table 요소로 그리고 행과 칸을 children으로 받는다', () => {
    render(
      <Table aria-label="비교">
        <tr>
          <TableCell type="header" scope="col">
            이름
          </TableCell>
        </tr>
        <tr>
          <TableCell>값</TableCell>
        </tr>
      </Table>,
    );
    const table = screen.getByRole('table', { name: '비교' });
    expect(table.tagName).toBe('TABLE');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('columnheader')).toHaveTextContent('이름');
    expect(screen.getByRole('cell')).toHaveTextContent('값');
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<Table className="mt-16" aria-label="표" />);
    expect(screen.getByRole('table')).toHaveClass('mt-16');
  });
});
