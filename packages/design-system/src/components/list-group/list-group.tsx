import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { SectionHeader } from '../section-header/section-header';

type ListGroupProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Show header 속성. 위쪽 머리글을 보일지 정한다 */
  showHeader?: boolean;
  /** 피그마 `items` 슬롯. 목록 항목을 세로로 넣는다 */
  children?: ReactNode;
};

/**
 * 머리글과 항목으로 된 목록 묶음(피그마 ListGroup)을 그린다. Start 목록·검색 결과·주소창 추천에 쓴다.
 * 머리글은 SectionHeader를 쓰고, 항목은 `children` 슬롯으로 채운다.
 * 너비는 갖지 않는다. 피그마 원본 너비 574는 미리보기 크기로만 두고, 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function ListGroup(props: ListGroupProps): JSX.Element {
  const { showHeader: hasHeader = true, children, className, ...divProps } = props;
  return (
    <div {...divProps} className={cn('flex flex-col items-start gap-2', className)}>
      {hasHeader && <SectionHeader className="shrink-0" />}
      <div className="flex w-full shrink-0 flex-col">{children}</div>
    </div>
  );
}
