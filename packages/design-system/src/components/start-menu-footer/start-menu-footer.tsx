import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type StartMenuFooterProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Content` 슬롯. 프로필과 전원 버튼을 넣는다 */
  children?: ReactNode;
};

/**
 * Start 메뉴 맨 아래 줄의 바탕(피그마 StartMenuFooter)을 그린다.
 * 너비는 쓰는 곳이 정하고, 높이는 `children` 슬롯의 내용이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function StartMenuFooter(props: StartMenuFooterProps): JSX.Element {
  const { children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center overflow-clip border-t-default border-card-stroke-default bg-subtle-fill-secondary px-48 py-16',
        className,
      )}
    >
      <div className="min-w-px flex-1">{children}</div>
    </div>
  );
}
