import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type WindowTitleKind = 'window' | 'preview';

type WindowTitleProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Kind 속성. window는 창 제목 표시줄, preview는 창 미리보기 머리글이다 */
  kind?: WindowTitleKind;
  /** 피그마 인스턴스 교체 속성 App icon. 앱마다 다른 아이콘이라 꼭 넘긴다. 16px 자리에 맞춰 그린다 */
  appIcon: ReactNode;
  /** 피그마 Title 속성. 창 제목 글자다 */
  title?: string;
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 제목 글자를 흐리게 그린다 */
  inactive?: boolean;
};

const kindClassNames = {
  window: 'gap-12 py-8 pr-0 pl-16',
  preview: 'gap-8 p-0',
} as const satisfies Record<WindowTitleKind, string>;

/**
 * 앱 아이콘과 창 제목 묶음(피그마 WindowTitle)을 그린다. 창 제목 표시줄과 창 미리보기 머리글에 쓴다.
 * 너비는 쓰는 곳이 정하고, 제목이 남는 너비를 채운다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function WindowTitle(props: WindowTitleProps): JSX.Element {
  const {
    kind = 'window',
    appIcon,
    title = '창 제목',
    inactive: isInactive = false,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn('flex items-center overflow-clip', kindClassNames[kind], className)}
    >
      <span className="inline-flex size-icon-16 shrink-0 items-center justify-center">
        {appIcon}
      </span>
      <p
        className={cn(
          'min-w-px flex-1 truncate type-caption',
          isInactive ? 'text-text-fill-tertiary' : 'text-text-fill-primary',
        )}
      >
        {title}
      </p>
    </div>
  );
}
