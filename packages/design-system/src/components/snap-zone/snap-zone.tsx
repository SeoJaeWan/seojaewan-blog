import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SnapZoneProps = Omit<ComponentProps<'div'>, 'children'>;

/**
 * 스냅 레이아웃 선택지의 칸 하나(피그마 SnapZone)를 그린다. SnapLayoutOption 안에서 쓴다.
 * 마우스를 올리면 강조색으로 바뀌고, 상태는 CSS `:hover`로 그린다(@codocs [[컴포넌트 목록:상태]]).
 * @param props
 */
export function SnapZone(props: SnapZoneProps): JSX.Element {
  const { className, ...divProps } = props;
  return (
    <div
      aria-hidden="true"
      {...divProps}
      className={cn(
        'h-56 w-40 rounded-control border-default border-control-stroke-default bg-control-alt-fill-secondary',
        'hover:border-control-stroke-on-accent-default hover:bg-accent-fill-default',
        className,
      )}
    />
  );
}
