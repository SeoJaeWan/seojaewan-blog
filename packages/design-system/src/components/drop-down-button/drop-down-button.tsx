import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type DropDownButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  label: string;
  subject?: string;
  className?: string;
};

/**
 * 현재 선택값과 아래 꺾쇠가 있는 드롭다운 버튼(피그마 DropDownButton)을 그린다. 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾸고, 키보드 포커스는 outline으로 그린다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[접근성:버튼 이름]]
 * @param props 컴포넌트 속성
 * @param props.label 피그마 Label. 현재 선택값 글자다
 * @param props.subject 무엇을 고르는 버튼인지. 주면 글자와 접근성 이름이 `무엇: 값`이 된다(`보기: 범주`)
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function DropDownButton({
  label,
  subject,
  className,
  ...buttonProps
}: DropDownButtonProps): JSX.Element {
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'relative inline-flex items-center justify-center gap-spacing-sm rounded-radius-control px-spacing-md py-spacing-sm-nudge whitespace-nowrap select-none',
        'focus-visible:outline-stroke-width-focus-outer focus-visible:outline-color-black-89 focus-visible:outline-solid',
        'motion-control-state',
        'bg-color-white-0 text-color-black-89',
        'hover:not-data-disabled:bg-color-black-4',
        'active:not-data-disabled:bg-color-black-2 active:not-data-disabled:text-color-black-61',
        'data-disabled:bg-color-white-0 data-disabled:text-color-black-36',
        className,
      )}
    >
      <span className="text-start type-body">
        {subject === undefined ? label : `${subject}: ${label}`}
      </span>
      <Asset name="icons/ic_fluent_chevron_down_16_regular.svg" className="size-size-icon-sm" />
    </BaseButton>
  );
}
