import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { SectionHeader } from '../section-header/section-header';

type ListGroupProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Show header 속성. 위쪽 머리글을 보일지 정한다 */
  showHeader?: boolean;
  /** 머리글(피그마 `header` SectionHeader 인스턴스)의 Label. 쓰는 곳마다 묶음 이름이 다르다 */
  label?: string;
  /** 피그마 `items` 슬롯. 목록 항목을 세로로 넣는다 */
  children?: ReactNode;
};

/**
 * 머리글과 항목으로 된 목록 묶음(피그마 ListGroup)을 그린다. Start 목록·검색 결과·주소창 추천에 쓴다.
 * 머리글은 SectionHeader를 쓰고(글자는 `label`), 항목은 `children` 슬롯으로 채운다. 항목 사이 간격은 2다.
 * 너비는 갖지 않는다. 피그마 원본 너비 574는 미리보기 크기로만 두고, 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function ListGroup(props: ListGroupProps): JSX.Element {
  const { showHeader: hasHeader = true, label, children, className, ...divProps } = props;
  return (
    <div {...divProps} className={cn('flex flex-col items-start gap-2', className)}>
      {hasHeader && <SectionHeader label={label} className="shrink-0" />}
      <div className="flex w-full shrink-0 flex-col gap-2">{children}</div>
    </div>
  );
}
