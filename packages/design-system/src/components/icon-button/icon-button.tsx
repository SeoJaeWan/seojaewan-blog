import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type IconButtonVariant = 'standard' | 'subtle' | 'chrome';

type IconButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Style. standard는 기본 버튼, subtle은 배경 없는 버튼, chrome은 Chrome 도구 모음용으로 아이콘 색이 chrome/text-secondary다 */
  variant?: IconButtonVariant;
  /** 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다 */
  label: string;
  /** 가운데 그릴 16px 아이콘이며 기본은 더보기(가로 점 세 개) 아이콘이다 */
  icon?: SvgAssetName;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 바탕·선·글자 색은 Button의 같은 Style과 같다. 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾼다.
// 안쪽 선은 ::before 고리(border-gradient-*, inner-border-*)로, 키보드 포커스는 outline으로 그린다.
const variantClassNames = {
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
  chrome: [
    'bg-subtle-fill-transparent text-chrome-text-secondary',
    'hover:not-data-disabled:bg-subtle-fill-secondary',
    'active:not-data-disabled:bg-subtle-fill-tertiary',
    'data-disabled:bg-subtle-fill-disabled data-disabled:text-text-fill-disabled',
  ],
} as const satisfies Record<IconButtonVariant, readonly string[]>;

/**
 * 아이콘만 있는 버튼(피그마 IconButton)을 그린다. 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function IconButton(props: IconButtonProps): JSX.Element {
  const {
    variant = 'standard',
    label,
    icon = 'icons/ic_fluent_more_horizontal_20_regular.svg',
    className,
    ...buttonProps
  } = props;
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'relative isolate inline-flex size-control-height items-center justify-center rounded-control select-none',
        'inner-border-w-default focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        'transition-colors duration-faster ease-fade',
        ...variantClassNames[variant],
        className,
      )}
    >
      <Asset name={icon} className="size-icon-16" />
    </BaseButton>
  );
}
