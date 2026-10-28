import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';

import { TableCell } from './table-cell';

function renderInRow(cell: JSX.Element) {
  return render(
    <table>
      <tbody>
        <tr>{cell}</tr>
      </tbody>
    </table>,
  );
}

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('TableCell', () => {
  it('본문 칸은 td로 그리고 서식이 섞인 내용을 children으로 받는다', () => {
    renderInRow(
      <TableCell>
        <strong>굵게</strong> 글
      </TableCell>,
    );
    const cell = screen.getByRole('cell');
    expect(cell.tagName).toBe('TD');
    expect(cell).toHaveClass('type-body-strong');
    expect(screen.getByText('굵게').tagName).toBe('STRONG');
  });

  it('머리 칸은 th로 그리고 배경과 굵은 글자 스타일을 준다', () => {
    renderInRow(
      <TableCell type="header" scope="col">
        제목
      </TableCell>,
    );
    const cell = screen.getByRole('columnheader');
    expect(cell.tagName).toBe('TH');
    expect(cell).toHaveClass('type-body-strong', 'bg-subtle-fill-secondary');
    expect(cell).toHaveAttribute('scope', 'col');
  });

  it('className으로 바깥 배치를 더한다', () => {
    renderInRow(<TableCell className="w-120" data-testid="cell" />);
    expect(screen.getByTestId('cell')).toHaveClass('w-120');
  });
});
