import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type ColumnsLayout = 'wide' | 'narrow';

type ColumnsProps = Omit<ComponentProps<'div'>, 'children'> & {
  layout?: ColumnsLayout;
  children?: ReactNode;
};

/**
 * Notion 열 나누기 블록(피그마 Columns)을 그린다. 넓은 창에서는 열을 나란히 놓고 좁은 창에서는 위에서 아래로 쌓는다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Notion 블록:지원 블록]]
 * @param props 컴포넌트 속성
 * @param props.layout 피그마 `Layout` 변형. 넓은 창(`wide`)은 열을 가로로 똑같이 나누고, 좁은 창(`narrow`)은 차례로 쌓는다. 넓은 창·좁은 창은 쓰는 곳이 글 화면 너비로 고른다
 * @param props.children 피그마 `Columns` 슬롯. Column을 차례로 넣는다. 넓은 창에서는 각 열이 남는 너비를 똑같이 나눠 채우고, 좁은 창에서는 너비를 채운다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Columns({
  layout = 'wide',
  children,
  className,
  ...divProps
}: ColumnsProps): JSX.Element {
  return (
    <div {...divProps} className={cn('flex flex-col', className)}>
      {/* 피그마 Columns 슬롯이다. 넓은 창은 가로(간격 spacing/3xl)로 열이 너비를 나눠 채우고, 좁은 창은 세로(간격 spacing/lg)로 쌓는다. */}
      <div
        className={cn(
          'flex w-full',
          layout === 'wide'
            ? 'flex-row items-start gap-spacing-3xl [&>*]:min-w-size-none [&>*]:flex-flex-fill'
            : 'flex-col gap-spacing-lg',
        )}
      >
        {children}
      </div>
    </div>
  );
}
