import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SnapZoneProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 접근성 이름. 글자가 없는 칸이라 aria-label로 붙인다(예: "왼쪽 절반") */
  label: string;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

/**
 * 스냅 레이아웃 선택지의 칸 하나(피그마 SnapZone)를 그린다. SnapLayoutOption 안에서 쓴다.
 * 눌러서 그 칸으로 창을 맞추므로 Base UI Button이다. 마우스를 올리면 강조색으로 바뀌고, 상태는 CSS `:hover`로 그린다(@codocs [[컴포넌트 목록:상태]]).
 * @param props
 */
export function SnapZone(props: SnapZoneProps): JSX.Element {
  const { label, className, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'block h-56 w-40 rounded-control border-default border-control-stroke-default bg-control-alt-fill-secondary',
        'hover:border-control-stroke-on-accent-default hover:bg-accent-fill-default',
        className,
      )}
    />
  );
}
