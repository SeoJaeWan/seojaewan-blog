import { type ComponentProps, createElement, type JSX } from 'react';

import { cn } from '../../cn';

type TableCellProps = ComponentProps<'td'> & {
  /** 피그마 `Type` 변형. `header`는 머리 칸(`th`), `body`는 본문 칸(`td`)이다 */
  type?: 'body' | 'header';
};

/**
 * 글 본문 표의 칸(피그마 TableCell)을 그린다. 칸 내용은 서식이 섞인 글이라 `children`으로 받는다.
 * 머리 칸은 `th`, 본문 칸은 `td`로 그려 표의 의미를 지킨다. 너비는 표와 쓰는 곳이 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 색과 선은 토큰 한 가지 모양이다(@codocs [[Chrome:Notion 블록]]).
 * 글자 스타일은 피그마와 같이 두 변형 모두 Body Strong이다(@codocs [[디자인 기반:서체]]).
 * @param props
 */
export function TableCell(props: TableCellProps): JSX.Element {
  const { type = 'body', className, children, ...cellProps } = props;
  const isHeader = type === 'header';
  return createElement(
    isHeader ? 'th' : 'td',
    {
      ...cellProps,
      // 피그마에서 오른쪽·아래쪽 선이 레이아웃에 들어가므로 CSS border를 쓴다.
      className: cn(
        'type-body-strong border-r-default border-b-default border-divider-stroke-default p-8 text-left align-top text-text-fill-primary',
        isHeader && 'bg-subtle-fill-secondary',
        className,
      ),
    },
    children,
  );
}
