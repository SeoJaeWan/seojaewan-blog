import { Input } from '@base-ui/react/input';
import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BreadcrumbProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다. `editing`이면 쓰지 않는다 */
  children?: ReactNode;
  /** 피그마 `Location icon` 인스턴스 교체 속성(`locationIcon`). 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다 */
  locationIcon: ReactNode;
  /** 피그마 State=Editing. 경로 대신 주소를 입력하는 중이다 */
  editing?: boolean;
  /** `editing`일 때 입력창의 처음 값이다 */
  address?: string;
};

/**
 * 현재 위치 경로를 보여 주는 줄(피그마 Breadcrumb)을 그린다. 탐색기 주소 줄에 쓴다.
 * Rest는 위치 아이콘, 꺾쇠, 경로 칸(children)이다. Editing은 경로 대신 주소 입력창과 아래 파란 선이다.
 * 아래 선은 테두리 위에 겹쳐 그려 레이아웃을 밀지 않는다. 너비는 갖지 않고 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function Breadcrumb(props: BreadcrumbProps): JSX.Element {
  const {
    children,
    locationIcon,
    editing: isEditing = false,
    address = '경로',
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex h-size-control-height items-center gap-spacing-xs rounded-radius-control border-stroke-width-default border-control-stroke-default px-spacing-sm',
        isEditing ? 'bg-control-fill-input-active' : 'overflow-clip bg-control-fill-default',
        className,
      )}
    >
      {isEditing ? (
        <>
          <Input
            type="text"
            aria-label="주소"
            defaultValue={address}
            className="min-w-size-hairline flex-flex-fill truncate type-caption text-text-fill-primary outline-none"
          />
          <div className="pointer-events-none absolute -inset-spacing-hairline overflow-clip rounded-radius-control">
            <div className="absolute inset-x-spacing-none bottom-spacing-none border-b-stroke-width-focus-outer border-accent-fill-default" />
          </div>
        </>
      ) : (
        <>
          <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center">
            {locationIcon}
          </span>
          <Asset
            name="icons/ic_fluent_chevron_right_16_regular.svg"
            className="size-size-icon-sm shrink-shrink-none text-text-fill-secondary"
          />
          {/* 피그마 Items 슬롯의 배치(가로, 간격 spacing/4)다 */}
          <div className="flex items-center gap-spacing-xs">{children}</div>
        </>
      )}
    </div>
  );
}
