import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type IconButtonVariant = 'standard' | 'subtle' | 'chrome';

type IconButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  variant?: IconButtonVariant;
  label: string;
  icon?: SvgAssetName;
  className?: string;
};

// 바탕·선·글자 색은 Button의 같은 Variant와 같다. 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾼다.
// 안쪽 선은 ::before 고리(border-gradient-*, inner-border-*)로, 키보드 포커스는 outline으로 그린다.
const variantClassNames = {
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
  chrome: [
    'bg-color-white-0 text-color-gray-70',
    'hover:not-data-disabled:bg-color-black-4',
    'active:not-data-disabled:bg-color-black-2',
    'data-disabled:bg-color-white-0 data-disabled:text-color-black-36',
  ],
} as const satisfies Record<IconButtonVariant, readonly string[]>;

/**
 * 아이콘만 있는 버튼(피그마 IconButton)을 그린다. 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props 컴포넌트 속성
 * @param props.variant 피그마 Variant. standard는 기본 버튼, subtle은 배경 없는 버튼, chrome은 Chrome 도구 모음용으로 아이콘 색이 chrome/text-secondary다
 * @param props.label 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다
 * @param props.icon 가운데 그릴 16px 아이콘이며 기본은 더보기(가로 점 세 개) 아이콘이다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function IconButton({
  variant = 'standard',
  label,
  icon = 'icons/ic_fluent_more_horizontal_20_regular.svg',
  className,
  ...buttonProps
}: IconButtonProps): JSX.Element {
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'relative isolate inline-flex size-size-control-height items-center justify-center rounded-radius-control select-none',
        'inner-border-w-stroke-width-default focus-visible:outline-stroke-width-focus-outer focus-visible:outline-color-black-89 focus-visible:outline-solid',
        'motion-control-state',
        ...variantClassNames[variant],
        className,
      )}
    >
      <Asset name={icon} className="size-size-icon-sm" />
    </BaseButton>
  );
}
