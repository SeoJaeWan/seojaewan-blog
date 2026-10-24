import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { SnapZone } from '../snap-zone/snap-zone';

export type SnapLayoutOptionLayout = 'half' | 'twothirds' | 'halfquarter' | 'quad';

type SnapLayoutOptionProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Layout. 칸을 나누는 방식 */
  layout?: SnapLayoutOptionLayout;
};

// SnapZone은 고정 크기를 가지므로, 열 안에서 남는 자리를 채우도록 크기를 덮어쓴다.
const ZONE_CLASS = 'h-auto min-h-0 w-full flex-1';

/**
 * 스냅 레이아웃 선택지 안의 레이아웃 하나(피그마 SnapLayoutOption)를 그린다. SnapLayoutFlyout에 쓴다.
 * 칸은 SnapZone 인스턴스로 조립한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SnapLayoutOption(props: SnapLayoutOptionProps): JSX.Element {
  const { layout = 'half', className, ...divProps } = props;
  const isTwoThirds = layout === 'twothirds';
  const isLeftSplit = layout === 'quad';
  const isRightSplit = layout === 'halfquarter' || layout === 'quad';
  return (
    <div {...divProps} className={cn('flex h-56 w-88 gap-4 overflow-clip', className)}>
      <div
        className={cn(
          'flex h-full min-w-0 flex-col gap-4 overflow-clip',
          isTwoThirds ? 'w-56 shrink-0' : 'flex-1',
        )}
      >
        {isLeftSplit ? (
          <>
            <SnapZone className={ZONE_CLASS} />
            <SnapZone className={ZONE_CLASS} />
          </>
        ) : (
          <SnapZone className={ZONE_CLASS} />
        )}
      </div>
      <div className="flex h-full min-w-0 flex-1 flex-col gap-4 overflow-clip">
        {isRightSplit ? (
          <>
            <SnapZone className={ZONE_CLASS} />
            <SnapZone className={ZONE_CLASS} />
          </>
        ) : (
          <SnapZone className={ZONE_CLASS} />
        )}
      </div>
    </div>
  );
}
