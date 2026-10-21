import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';
import { FocusRect } from '../focus-rect/focus-rect';

export type ButtonVariant = 'accent' | 'standard' | 'subtle';

type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  /** 피그마 Style. accent는 강조 채우기, standard는 기본 버튼, subtle은 배경 없는 버튼이다 */
  variant?: ButtonVariant;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 상태 색은 실제 CSS 상태(hover, active, disabled)로 바꾼다. 강제로 상태를 주는 prop은 두지 않는다.
// 테두리는 피그마 안쪽 선처럼 레이아웃에 들어가지 않게 ::before 고리(border-gradient-*, inner-border-*)로 그린다.
const variantClassNames = {
  accent: [
    'bg-accent-fill-default text-text-on-accent-fill-primary',
    'not-data-disabled:not-active:border-gradient-elevation-accent-control-border',
    'hover:not-data-disabled:bg-accent-fill-secondary',
    'active:not-data-disabled:bg-accent-fill-tertiary active:not-data-disabled:text-text-on-accent-fill-secondary active:not-data-disabled:inner-border-control-stroke-on-accent-default',
    'data-disabled:bg-accent-fill-disabled data-disabled:text-text-on-accent-fill-disabled',
  ],
  standard: [
    'bg-control-fill-default text-text-fill-primary',
    'not-data-disabled:not-active:border-gradient-elevation-control-border',
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
 * 기본 버튼(피그마 Button)을 그린다. 키보드 포커스일 때만 FocusRect를 보인다.
 * 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Button(props: ButtonProps): JSX.Element {
  const { variant = 'standard', className, children, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      className={mergeClassNames(
        'group relative isolate inline-flex min-w-button-min-width items-center justify-center gap-8 rounded-control px-12 py-6 type-body whitespace-nowrap outline-none select-none',
        'transition-colors duration-faster ease-fade',
        ...variantClassNames[variant],
        className,
      )}
    >
      {children}
      <FocusRect className="hidden group-focus-visible:block" />
    </BaseButton>
  );
}
