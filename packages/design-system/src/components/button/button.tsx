import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type ButtonVariant = 'accent' | 'standard' | 'subtle';

type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Style. accent는 강조 채우기, standard는 기본 버튼, subtle은 배경 없는 버튼이다 */
  variant?: ButtonVariant;
  /** 피그마 Label. 버튼 글자이자 접근성 이름이다 */
  label: string;
  /** 피그마 Show icon. 글자 앞에 16px 아이콘을 그린다 */
  showIcon?: boolean;
  /** 피그마 Icon. showIcon일 때 그릴 아이콘이며 기본은 더하기 아이콘이다 */
  icon?: SvgAssetName;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾼다. 강제로 상태를 주는 prop은 두지 않는다.
// 안쪽 선은 피그마 안쪽 선처럼 레이아웃에 들어가지 않게 ::before 고리(border-gradient-*, inner-border-*)로,
// 키보드 포커스는 피그마 바깥 선(F1)처럼 outline으로 그린다. 포커스일 때는 안쪽 선을 그리지 않는다.
const variantClassNames = {
  accent: [
    'bg-color-blue-59 text-color-white',
    'not-data-disabled:not-active:not-focus-visible:border-gradient-elevation-accent-control-border',
    'hover:not-data-disabled:bg-color-blue-59-90',
    'active:not-data-disabled:bg-color-blue-59-80 active:not-data-disabled:text-color-white-70 active:not-data-disabled:inner-border-color-white-8',
    'data-disabled:bg-color-black-22 data-disabled:text-color-white',
  ],
  standard: [
    'bg-color-white-70 text-color-black-89',
    'not-data-disabled:not-active:not-focus-visible:border-gradient-elevation-control-border',
    'hover:not-data-disabled:bg-color-gray-3-50',
    'active:not-data-disabled:bg-color-gray-2-30 active:not-data-disabled:text-color-black-61 active:not-data-disabled:inner-border-color-black-6',
    'data-disabled:bg-color-gray-2-30 data-disabled:text-color-black-36 data-disabled:inner-border-color-black-6',
  ],
  subtle: [
    'bg-color-white-0 text-color-black-89',
    'hover:not-data-disabled:bg-color-black-4',
    'active:not-data-disabled:bg-color-black-2 active:not-data-disabled:text-color-black-61',
    'data-disabled:bg-color-white-0 data-disabled:text-color-black-36',
  ],
} as const satisfies Record<ButtonVariant, readonly string[]>;

/**
 * 기본 버튼(피그마 Button)을 그린다. 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Button(props: ButtonProps): JSX.Element {
  const {
    variant = 'standard',
    label,
    showIcon: hasIcon = false,
    icon = 'icons/ic_fluent_add_20_regular.svg',
    className,
    ...buttonProps
  } = props;
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'relative isolate inline-flex min-w-size-button-min-width items-center justify-center gap-spacing-sm rounded-radius-control px-spacing-md py-spacing-sm-nudge whitespace-nowrap select-none',
        'inner-border-w-stroke-width-default focus-visible:outline-stroke-width-focus-outer focus-visible:outline-color-black-89 focus-visible:outline-solid',
        'motion-control-state',
        ...variantClassNames[variant],
        className,
      )}
    >
      {hasIcon && <Asset name={icon} className="size-size-icon-sm" />}
      <span className="text-start type-body">{label}</span>
    </BaseButton>
  );
}
