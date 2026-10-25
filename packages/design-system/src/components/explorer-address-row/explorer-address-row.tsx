import type { ChangeEvent, ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { IconButton } from '../icon-button/icon-button';
import { SearchBox } from '../search-box/search-box';

export type ExplorerAddressRowDevice = 'desktop' | 'mobile';

type ExplorerAddressRowProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Device. desktop은 뒤로·앞으로·위로·새로고침과 검색 상자, mobile은 뒤로 버튼과 검색 버튼만 보인다 */
  device?: ExplorerAddressRowDevice;
  /** 피그마 Breadcrumb의 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다 */
  children?: ReactNode;
  /** 피그마 Breadcrumb의 `Location icon` 인스턴스 교체 속성. 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다 */
  locationIcon: ReactNode;
  /** 뒤로 버튼을 눌렀을 때 */
  onBack?: () => void;
  /** 앞으로 버튼을 눌렀을 때. desktop만 보인다 */
  onForward?: () => void;
  /** 위로 버튼을 눌렀을 때. desktop만 보인다 */
  onUp?: () => void;
  /** 새로고침 버튼을 눌렀을 때. desktop만 보인다 */
  onRefresh?: () => void;
  /** 검색 상자의 안내 글자. desktop만 보인다. 탐색기 창은 `<현재 폴더> 검색`처럼 덮어쓴다 */
  searchPlaceholder?: string;
  /** 검색 상자에 입력할 때. desktop만 보인다 */
  onSearchChange?: (value: string) => void;
  /** 검색 버튼을 눌렀을 때. mobile만 보인다 */
  onSearch?: () => void;
};

/**
 * 탐색기 본문 맨 위의 이동 버튼·경로·검색 줄(피그마 ExplorerAddressRow)을 그린다.
 * Breadcrumb, IconButton, SearchBox를 조립한다. 너비는 갖지 않고 쓰는 곳이 정한다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function ExplorerAddressRow(props: ExplorerAddressRowProps): JSX.Element {
  const {
    device = 'desktop',
    children,
    locationIcon,
    onBack: handleBack,
    onForward: handleForward,
    onUp: handleUp,
    onRefresh: handleRefresh,
    searchPlaceholder = '검색',
    onSearchChange: handleSearchChange,
    onSearch: handleSearch,
    className,
    ...divProps
  } = props;
  const isDesktop = device === 'desktop';
  return (
    <div {...divProps} className={cn('flex items-center gap-4 overflow-clip px-8 py-6', className)}>
      <IconButton
        variant="subtle"
        label="뒤로"
        icon="icons/ic_fluent_arrow_left_20_regular.svg"
        onClick={handleBack}
      />
      {isDesktop ? (
        <>
          <IconButton
            variant="subtle"
            label="앞으로"
            icon="icons/ic_fluent_arrow_right_20_regular.svg"
            onClick={handleForward}
          />
          <IconButton
            variant="subtle"
            label="위로"
            icon="icons/ic_fluent_arrow_up_20_regular.svg"
            onClick={handleUp}
          />
          <IconButton
            variant="subtle"
            label="새로 고침"
            icon="icons/ic_fluent_arrow_clockwise_20_regular.svg"
            onClick={handleRefresh}
          />
        </>
      ) : null}
      <Breadcrumb locationIcon={locationIcon} className="min-w-px flex-1">
        {children}
      </Breadcrumb>
      {isDesktop ? (
        <SearchBox
          aria-label="검색"
          placeholder={searchPlaceholder}
          className="w-240 shrink-0"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleSearchChange?.(event.target.value)
          }
        />
      ) : (
        <IconButton
          variant="subtle"
          label="검색"
          icon="icons/ic_fluent_search_20_regular.svg"
          onClick={handleSearch}
        />
      )}
    </div>
  );
}
