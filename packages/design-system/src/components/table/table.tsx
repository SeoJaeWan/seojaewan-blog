import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type TableProps = Omit<ComponentProps<'table'>, 'children'> & {
  /** 피그마 `Rows` 슬롯. 행(`tr`)을 넣고, 칸은 `TableCell`로 그린다 */
  children?: ReactNode;
};

/**
 * 글 본문의 표(피그마 Table) 틀을 `table` 요소로 그린다. 행은 `children` 슬롯으로 채운다.
 * 칸의 오른쪽·아래 선(`TableCell`)과 이어지도록 틀은 왼쪽·위 선만 가진다.
 * 너비는 부모를 채우고 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 색과 선은 토큰 한 가지 모양이다(@codocs [[Chrome:Notion 블록]]).
 * @param props
 */
export function Table(props: TableProps): JSX.Element {
  const { children, className, ...tableProps } = props;
  return (
    <table
      {...tableProps}
      // 피그마에서 왼쪽·위쪽 선이 레이아웃에 들어가므로 CSS border를 쓴다.
      className={cn(
        'w-full table-fixed border-separate border-spacing-0 border-t-default border-l-default border-divider-stroke-default',
        className,
      )}
    >
      <tbody>{children}</tbody>
    </table>
  );
}
