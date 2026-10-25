import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type NavigationPaneProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `items` 슬롯. 폴더 트리의 NavigationItem을 세로로 넣는다 */
  children?: ReactNode;
};

/**
 * 파일 탐색기 본문 왼쪽의 폴더 트리 영역(피그마 NavigationPane)을 그린다.
 * 항목은 `children` 슬롯으로 채우고, 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function NavigationPane(props: NavigationPaneProps): JSX.Element {
  const { children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn('flex flex-col items-start overflow-clip px-4 py-8', className)}
    >
      <div className="flex w-full shrink-0 flex-col">{children}</div>
    </div>
  );
}
