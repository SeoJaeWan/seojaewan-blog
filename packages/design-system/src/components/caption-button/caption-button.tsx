import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type CaptionButtonKind = 'default' | 'close';

type CaptionButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Kind. default는 최소화·최대화 버튼, close는 닫기 버튼이다 */
  kind?: CaptionButtonKind;
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 아이콘을 흐리게 그린다 */
  inactive?: boolean;
  /** 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다 */
  label: string;
  /** 가운데 그릴 16px 아이콘. kind가 default일 때만 쓰고 기본은 최소화 아이콘이다. close는 닫기 아이콘으로 고정이다 */
  icon?: SvgAssetName;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 상태 색은 실제 CSS 상태(hover, active)로 바꾼다. Inactive는 바탕 없이 아이콘만 흐리고, 마우스를 올리거나 누르면 그 상태 색이 이긴다.
const kindClassNames = {
  default: [
    'bg-subtle-fill-transparent',
    'hover:bg-subtle-fill-secondary hover:text-text-fill-primary',
    'active:bg-subtle-fill-tertiary active:text-text-fill-secondary',
  ],
  close: [
    'bg-subtle-fill-transparent',
    'hover:bg-caption-button-close-fill-hover hover:text-caption-button-close-glyph-hover',
    'active:bg-caption-button-close-fill-pressed active:text-caption-button-close-glyph-pressed',
  ],
} as const satisfies Record<CaptionButtonKind, readonly string[]>;

/**
 * 창 제목 표시줄의 최소화·최대화·닫기 버튼 하나(피그마 CaptionButton)를 그린다. 동작과 접근성은 Base UI Button이 맡는다.
 * 크기는 Windows가 정한 46×32로 고정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function CaptionButton(props: CaptionButtonProps): JSX.Element {
  const {
    kind = 'default',
    inactive: isInactive = false,
    label,
    icon = 'icons/ic_fluent_subtract_20_regular.svg',
    className,
    ...buttonProps
  } = props;
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'inline-flex h-32 w-46 items-center justify-center select-none',
        'transition-colors duration-faster ease-fade',
        isInactive ? 'text-text-fill-disabled' : 'text-text-fill-primary',
        ...kindClassNames[kind],
        className,
      )}
    >
      <Asset
        name={kind === 'close' ? 'icons/ic_fluent_dismiss_20_regular.svg' : icon}
        className="size-icon-16"
      />
    </BaseButton>
  );
}
