import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type NavigationPaneProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
};

/**
 * 파일 탐색기 본문 왼쪽의 폴더 트리 영역(피그마 NavigationPane)을 그린다.
 * 항목은 `children` 슬롯으로 채우고, 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props 컴포넌트 속성
 * @param props.children 피그마 `Items` 슬롯. 폴더 트리의 NavigationItem을 세로로 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function NavigationPane({
  children,
  className,
  ...divProps
}: NavigationPaneProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col items-start overflow-clip px-spacing-xs py-spacing-sm',
        className,
      )}
    >
      <div className="flex w-full shrink-shrink-none flex-col">{children}</div>
    </div>
  );
}
