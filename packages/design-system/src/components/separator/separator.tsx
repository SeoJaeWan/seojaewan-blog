import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

export type SeparatorOrientation = 'horizontal' | 'vertical';

type SeparatorProps = Omit<ComponentProps<'div'>, 'children'> & {
  orientation?: SeparatorOrientation;
};

/**
 * 메뉴·카드·목록 사이를 나누는 구분선(피그마 Separator)을 그린다.
 * 가로선의 너비는 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props 컴포넌트 속성
 * @param props.orientation 피그마 Orientation. horizontal은 가로선(너비는 쓰는 곳이 정한다), vertical은 높이 16의 세로선이다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Separator({
  orientation = 'horizontal',
  className,
  ...divProps
}: SeparatorProps): JSX.Element {
  const isVertical = orientation === 'vertical';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      {...divProps}
      className={cn(
        'shrink-shrink-none bg-color-black-8',
        isVertical
          ? 'h-size-separator-height w-stroke-stroke-width-default'
          : 'h-stroke-stroke-width-default',
        className,
      )}
    />
  );
}
