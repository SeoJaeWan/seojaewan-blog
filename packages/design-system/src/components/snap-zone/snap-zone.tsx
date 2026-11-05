import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SnapZoneProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  label: string;
  className?: string;
};

/**
 * 스냅 레이아웃 선택지의 칸 하나(피그마 SnapZone)를 그린다. SnapLayoutOption 안에서 쓴다.
 * 눌러서 그 칸으로 창을 맞추므로 Base UI Button이다. 마우스를 올리면 강조색으로 바뀌고, 상태는 CSS `:hover`로 그린다(@codocs [[컴포넌트 목록:상태]]).
 * @param props 컴포넌트 속성
 * @param props.label 접근성 이름. 글자가 없는 칸이라 aria-label로 붙인다(예: "왼쪽 절반")
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function SnapZone({ label, className, ...buttonProps }: SnapZoneProps): JSX.Element {
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'block h-size-snap-option-height w-size-snap-option-zone-width rounded-radius-control border-stroke-width-default border-color-black-6 bg-color-black-2',
        'hover:border-color-white-8 hover:bg-color-blue-59',
        className,
      )}
    />
  );
}
