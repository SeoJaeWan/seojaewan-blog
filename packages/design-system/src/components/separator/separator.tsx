import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

export type SeparatorOrientation = 'horizontal' | 'vertical';

type SeparatorProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Orientation. horizontal은 가로선(너비는 쓰는 곳이 정한다), vertical은 높이 16의 세로선이다 */
  orientation?: SeparatorOrientation;
};

/**
 * 메뉴·카드·목록 사이를 나누는 구분선(피그마 Separator)을 그린다.
 * 가로선의 너비는 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function Separator(props: SeparatorProps): JSX.Element {
  const { orientation = 'horizontal', className, ...divProps } = props;
  const isVertical = orientation === 'vertical';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      {...divProps}
      className={cn(
        'shrink-0 bg-divider-stroke-default',
        isVertical ? 'h-16 w-stroke-default' : 'h-stroke-default',
        className,
      )}
    />
  );
}
