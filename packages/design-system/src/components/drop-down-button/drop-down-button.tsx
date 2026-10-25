import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type DropDownButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Label. 현재 선택값 글자이자 접근성 이름이다 */
  label: string;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

/**
 * 현재 선택값과 아래 꺾쇠가 있는 드롭다운 버튼(피그마 DropDownButton)을 그린다. 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾸고, 키보드 포커스는 outline으로 그린다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function DropDownButton(props: DropDownButtonProps): JSX.Element {
  const { label, className, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'relative inline-flex items-center justify-center gap-8 rounded-control px-12 py-6 whitespace-nowrap select-none',
        'focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        'motion-control-state',
        'bg-subtle-fill-transparent text-text-fill-primary',
        'hover:not-data-disabled:bg-subtle-fill-secondary',
        'active:not-data-disabled:bg-subtle-fill-tertiary active:not-data-disabled:text-text-fill-secondary',
        'data-disabled:bg-subtle-fill-disabled data-disabled:text-text-fill-disabled',
        className,
      )}
    >
      <span className="text-start type-body">{label}</span>
      <Asset name="icons/ic_fluent_chevron_down_16_regular.svg" className="size-icon-16" />
    </BaseButton>
  );
}
