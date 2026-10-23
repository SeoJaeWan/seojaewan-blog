import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';
import { Asset } from '../asset/asset';

export type ButtonVariant = 'accent' | 'standard' | 'subtle';

type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  /** 피그마 Style. accent는 강조 채우기, standard는 기본 버튼, subtle은 배경 없는 버튼이다 */
  variant?: ButtonVariant;
  /** 피그마 Show icon. 이름 앞에 더하기 아이콘을 그린다 */
  showIcon?: boolean;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾼다. 강제로 상태를 주는 prop은 두지 않는다.
// 안쪽 선은 피그마 안쪽 선처럼 레이아웃에 들어가지 않게 ::before 고리(border-gradient-*, inner-border-*)로,
// 키보드 포커스는 피그마 바깥 선(F1)처럼 outline으로 그린다. 포커스일 때는 안쪽 선을 그리지 않는다.
const variantClassNames = {
  accent: [
    'bg-accent-fill-default text-text-on-accent-fill-primary',
    'not-data-disabled:not-active:not-focus-visible:border-gradient-elevation-accent-control-border',
    'hover:not-data-disabled:bg-accent-fill-secondary',
    'active:not-data-disabled:bg-accent-fill-tertiary active:not-data-disabled:text-text-on-accent-fill-secondary active:not-data-disabled:inner-border-control-stroke-on-accent-default',
    'data-disabled:bg-accent-fill-disabled data-disabled:text-text-on-accent-fill-disabled',
  ],
  standard: [
    'bg-control-fill-default text-text-fill-primary',
    'not-data-disabled:not-active:not-focus-visible:border-gradient-elevation-control-border',
    'hover:not-data-disabled:bg-control-fill-secondary',
    'active:not-data-disabled:bg-control-fill-tertiary active:not-data-disabled:text-text-fill-secondary active:not-data-disabled:inner-border-control-stroke-default',
    'data-disabled:bg-control-fill-disabled data-disabled:text-text-fill-disabled data-disabled:inner-border-control-stroke-default',
  ],
  subtle: [
    'bg-subtle-fill-transparent text-text-fill-primary',
    'hover:not-data-disabled:bg-subtle-fill-secondary',
    'active:not-data-disabled:bg-subtle-fill-tertiary active:not-data-disabled:text-text-fill-secondary',
    'data-disabled:bg-subtle-fill-disabled data-disabled:text-text-fill-disabled',
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
    showIcon: hasIcon = false,
    className,
    children,
    ...buttonProps
  } = props;
  return (
    <BaseButton
      {...buttonProps}
      // @codocs [[피그마 일치 검사:짝짓기]] 피그마 Button 변형 루트와 짝짓는다.
      data-figma-root="Button"
      className={mergeClassNames(
        'relative isolate inline-flex min-w-button-min-width items-center justify-center gap-8 rounded-control px-12 py-6 whitespace-nowrap select-none',
        'inner-border-w-default focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        'transition-colors duration-faster ease-fade',
        ...variantClassNames[variant],
        className,
      )}
    >
      {hasIcon && (
        <Asset
          data-figma="icon"
          name="icons/ic_fluent_add_20_regular.svg"
          className="size-icon-16"
        />
      )}
      <span data-figma="label" className="text-start type-body">
        {children}
      </span>
    </BaseButton>
  );
}
