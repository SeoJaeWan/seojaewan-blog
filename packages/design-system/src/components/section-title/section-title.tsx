import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type SectionTitleProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Title 속성. 제목 글자다 */
  title?: string;
  /** 피그마 Show action 속성. 오른쪽 동작 자리를 보일지 정한다 */
  showAction?: boolean;
  /** 피그마 Action 속성. 오른쪽 동작 자리에 넣을 것(보통 DropDownButton)이다 */
  action?: ReactNode;
};

/**
 * 목록 위 섹션 제목(피그마 SectionTitle)을 그린다. Start 메뉴의 고정됨·모두 제목과 글 목차 제목에 쓴다.
 * 너비는 쓰는 곳이 정하고, 제목이 남는 너비를 채운다. 동작 자리는 슬롯이라 비어 있다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SectionTitle(props: SectionTitleProps): JSX.Element {
  const {
    title = '섹션 제목',
    showAction: hasAction = false,
    action,
    className,
    ...divProps
  } = props;
  return (
    <div {...divProps} className={cn('flex items-center overflow-clip', className)}>
      <p className="min-w-px flex-1 type-body-strong text-text-fill-primary">{title}</p>
      {hasAction ? action : null}
    </div>
  );
}
