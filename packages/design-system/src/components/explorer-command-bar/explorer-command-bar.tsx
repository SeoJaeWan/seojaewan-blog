import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ExplorerCommandBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Commands` 슬롯. 현재 위치에서 쓸 수 있는 명령 버튼을 넣는다 */
  children?: ReactNode;
};

/**
 * 탐색기 주소 줄 아래의 명령 막대(피그마 ExplorerCommandBar)를 그린다.
 * 너비는 쓰는 곳이 정하고, 슬롯은 가로로 놓고 간격 4, 높이 size/control/height다. 비어 있어도 높이를 지킨다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function ExplorerCommandBar(props: ExplorerCommandBarProps): JSX.Element {
  const { children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center gap-spacing-xs overflow-clip px-spacing-md py-spacing-sm',
        className,
      )}
    >
      <div className="flex h-size-control-height min-w-size-none flex-flex-fill items-center gap-spacing-xs">
        {children}
      </div>
    </div>
  );
}
