import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BreadcrumbProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다 */
  children?: ReactNode;
  /** 피그마 `Location icon` 인스턴스 교체 속성(`locationIcon`). 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다 */
  locationIcon: ReactNode;
};

/**
 * 현재 위치 경로를 보여 주는 줄(피그마 Breadcrumb)을 그린다. 탐색기 주소 줄에 쓴다.
 * 위치 아이콘, 꺾쇠, 경로 칸(children)이다. 너비는 갖지 않고 쓰는 곳이 정한다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function Breadcrumb(props: BreadcrumbProps): JSX.Element {
  const { children, locationIcon, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-size-control-height items-center gap-spacing-xs overflow-clip rounded-radius-control border-stroke-width-default border-color-black-6 bg-color-white-70 px-spacing-sm',
        className,
      )}
    >
      <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
        {locationIcon}
      </span>
      <Asset
        name="icons/ic_fluent_chevron_right_16_regular.svg"
        className="size-size-icon-sm shrink-shrink-none text-color-black-61"
      />
      {/* 피그마 Items 슬롯의 배치(가로, 간격 spacing/xs)다 */}
      <div className="flex items-center gap-spacing-xs">{children}</div>
    </div>
  );
}
