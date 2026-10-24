import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type TileGridAlign = 'start' | 'center';

type TileGridProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Align. 줄바꿈한 타일 줄을 왼쪽(start)이나 가운데(center)에 모은다 */
  align?: TileGridAlign;
  /** 피그마 `tiles` 슬롯. 가로로 늘어놓고 줄바꿈할 타일을 넣는다 */
  children?: ReactNode;
};

/**
 * 타일을 가로로 늘어놓고 줄바꿈하는 묶음(피그마 TileGrid)을 그린다.
 * 타일은 `children` 슬롯으로 채우고, 타일 사이 간격은 타일이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function TileGrid(props: TileGridProps): JSX.Element {
  const { align = 'start', children, className, ...divProps } = props;
  const isCenter = align === 'center';
  return (
    <div
      {...divProps}
      className={cn('flex w-574 flex-col', !isCenter && 'overflow-clip', className)}
    >
      <div className={cn('flex w-full flex-wrap overflow-clip', isCenter && 'justify-center')}>
        {children}
      </div>
    </div>
  );
}
