import { Button as BaseButton } from '@base-ui/react/button';
import { type ComponentProps, type JSX, useContext } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import {
  type CaptionButtonTitleBar,
  captionButtonTitleBarContext,
} from './caption-button-title-bar';

export type { CaptionButtonTitleBar } from './caption-button-title-bar';

export type CaptionButtonVariant = 'default' | 'close';

type CaptionButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  variant?: CaptionButtonVariant;
  titleBar?: CaptionButtonTitleBar;
  isInactive?: boolean;
  label: string;
  icon?: SvgAssetName;
  className?: string;
};

// 상태 색은 실제 CSS 상태(hover, active)로 바꾼다. Inactive는 바탕 없이 아이콘만 흐리고, 마우스를 올리거나 누르면 그 상태 색이 이긴다.
const variantClassNames = {
  default: [
    'bg-color-white-0',
    'hover:bg-color-black-4 hover:text-color-black-89',
    'active:bg-color-black-2 active:text-color-black-61',
  ],
  close: [
    'bg-color-white-0',
    'hover:bg-color-red-56 hover:text-color-white',
    'active:bg-color-red-56-90 active:text-color-white-70',
  ],
} as const satisfies Record<CaptionButtonVariant, readonly string[]>;

// 높이는 제목 표시줄 높이에 맞춘다. 탭이 있는 높은 제목 표시줄(custom)에서는 위아래를 꽉 채운다.
const titleBarClassNames = {
  default: 'h-size-caption-button-height',
  custom: 'h-size-window-tall-title-bar-height',
} as const satisfies Record<CaptionButtonTitleBar, string>;

/**
 * 창 제목 표시줄의 최소화·최대화·닫기 버튼 하나(피그마 CaptionButton)를 그린다. 동작과 접근성은 Base UI Button이 맡는다.
 * 너비는 Windows가 정한 46으로 고정하고, 높이는 제목 표시줄에 맞춰 32(default) 또는 40(custom)이다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[창 동작:창 조작]]
 * @param props 컴포넌트 속성
 * @param props.variant 피그마 Variant. default는 최소화·최대화 버튼, close는 닫기 버튼이다
 * @param props.titleBar 피그마 Title bar. default는 일반 창 제목 표시줄(32), custom은 탭이 있는 높은 제목 표시줄(40)이다. 주지 않으면 감싼 CaptionButtonGroup의 값을 따르고, 묶음 밖이면 default다
 * @param props.isInactive 피그마 State=Inactive. 창이 활성 상태가 아니면 아이콘을 흐리게 그린다
 * @param props.label 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다
 * @param props.icon 가운데 그릴 16px 아이콘. variant가 default일 때만 쓰고 기본은 최소화 아이콘이다. close는 닫기 아이콘으로 고정이다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function CaptionButton({
  variant = 'default',
  titleBar: titleBarProp,
  isInactive = false,
  label,
  icon = 'icons/ic_fluent_subtract_20_regular.svg',
  className,
  ...buttonProps
}: CaptionButtonProps): JSX.Element {
  const groupTitleBar = useContext(captionButtonTitleBarContext);
  const titleBar = titleBarProp ?? groupTitleBar;
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'inline-flex w-size-caption-button-width items-center justify-center select-none',
        titleBarClassNames[titleBar],
        'motion-control-state',
        isInactive ? 'text-color-black-36' : 'text-color-black-89',
        ...variantClassNames[variant],
        className,
      )}
    >
      <Asset
        name={variant === 'close' ? 'icons/ic_fluent_dismiss_20_regular.svg' : icon}
        className="size-size-icon-sm"
      />
    </BaseButton>
  );
}
