import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type CalloutProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Icon` 인스턴스 교체 속성(레이어 `icon`). 글마다 다른 아이콘이라 필수다 */
  icon: ReactNode;
  /** 피그마 `Content` 슬롯. 강조할 글 블록을 넣는다 */
  children?: ReactNode;
};

/**
 * 글 본문의 강조 상자(피그마 Callout)를 그린다. 아이콘은 `icon`, 글은 `children` 슬롯으로 채운다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 색과 모서리는 토큰 한 가지 모양이다(@codocs [[Notion 블록:모양]]).
 * @param props
 */
export function Callout(props: CalloutProps): JSX.Element {
  const { icon, children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가므로 CSS border를 쓴다.
      className={cn(
        'flex items-start gap-spacing-md rounded-radius-overlay border-stroke-width-default border-card-stroke-default bg-card-background-fill-secondary p-spacing-lg',
        className,
      )}
    >
      <div className="flex h-size-post-block-icon-box shrink-shrink-none items-center justify-center">
        <div className="size-size-icon-md shrink-shrink-none text-text-fill-primary [&>*]:size-full [&>*]:object-contain">
          {icon}
        </div>
      </div>
      {/* 피그마 Content 슬롯 글자는 글 본문 글자(Body Large, 굵은 글자는 Body Large Strong)다. */}
      <div className="min-w-size-none flex-flex-fill type-body-large text-text-fill-primary [&_strong]:font-font-weight-semibold">
        {children}
      </div>
    </div>
  );
}
