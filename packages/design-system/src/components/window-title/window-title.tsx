import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type WindowTitleVariant = 'window' | 'preview';

type WindowTitleProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Variant 속성. window는 창 제목 표시줄, preview는 창 미리보기 머리글이다 */
  variant?: WindowTitleVariant;
  /** 피그마 인스턴스 교체 속성 App icon. 앱마다 다른 아이콘이라 꼭 넘긴다. 16px 자리에 맞춰 그린다 */
  appIcon: ReactNode;
  /** 피그마 Title 속성. 창 제목 글자다 */
  title?: string;
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 제목 글자를 흐리게 그린다 */
  isInactive?: boolean;
};

const variantClassNames = {
  window: 'gap-spacing-md py-spacing-sm pr-spacing-none pl-spacing-lg',
  preview: 'gap-spacing-sm p-spacing-none',
} as const satisfies Record<WindowTitleVariant, string>;

/**
 * 앱 아이콘과 창 제목 묶음(피그마 WindowTitle)을 그린다. 창 제목 표시줄과 창 미리보기 머리글에 쓴다.
 * 너비는 쓰는 곳이 정하고, 제목이 남는 너비를 채운다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function WindowTitle(props: WindowTitleProps): JSX.Element {
  const {
    variant = 'window',
    appIcon,
    title = '창 제목',
    isInactive = false,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn('flex items-center overflow-clip', variantClassNames[variant], className)}
    >
      <span className="inline-flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
        {appIcon}
      </span>
      <p
        className={cn(
          'min-w-size-none flex-flex-fill truncate type-caption',
          isInactive ? 'text-color-black-56' : 'text-color-black-89',
        )}
      >
        {title}
      </p>
    </div>
  );
}
