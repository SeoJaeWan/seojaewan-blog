import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ColumnProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
};

/**
 * 열 나누기 블록의 열 하나(피그마 Column)를 그린다. 안의 블록을 위에서 아래로 쌓는다. Columns의 슬롯에 넣는다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Notion 블록:지원 블록]]
 * @param props 컴포넌트 속성
 * @param props.children 피그마 `Content` 슬롯. 열 안의 글 블록을 차례로 넣는다. 블록은 열 너비를 채운다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Column({ children, className, ...divProps }: ColumnProps): JSX.Element {
  return (
    <div {...divProps} className={cn('flex flex-col', className)}>
      {/* 피그마 Content 슬롯의 배치(세로, 간격 spacing/lg)다. 블록은 열 너비를 채운다. */}
      <div className="flex w-full flex-col gap-spacing-lg">{children}</div>
    </div>
  );
}
