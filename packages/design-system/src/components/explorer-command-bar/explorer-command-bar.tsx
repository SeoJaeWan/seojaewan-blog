import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ExplorerCommandBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Commands` 슬롯. 현재 위치에서 쓸 수 있는 명령 버튼을 넣는다 */
  children?: ReactNode;
};

/**
 * 탐색기 주소 줄 아래의 명령 막대(피그마 ExplorerCommandBar)를 그린다.
 * 너비는 쓰는 곳이 정하고, 높이는 `children` 슬롯의 내용이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function ExplorerCommandBar(props: ExplorerCommandBarProps): JSX.Element {
  const { children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn('flex items-center gap-4 overflow-clip px-12 py-8', className)}
    >
      <div className="min-w-px flex-1">{children}</div>
    </div>
  );
}
