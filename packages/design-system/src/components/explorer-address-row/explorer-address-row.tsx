import type { ChangeEvent, ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { IconButton } from '../icon-button/icon-button';
import { SearchBox } from '../search-box/search-box';

export type ExplorerAddressRowDevice = 'desktop' | 'mobile';

export type ExplorerAddressRowSearch = 'closed' | 'open';

type ExplorerAddressRowProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Device. desktop은 뒤로·앞으로·위로·새로고침과 검색 상자, mobile은 뒤로 버튼과 검색 버튼만 보인다 */
  device?: ExplorerAddressRowDevice;
  /**
   * 피그마 Search. mobile에서 open이면 줄 전체가 ← 버튼과 나머지 폭을 채우는 검색 상자(검색 줄)로 바뀌고,
   * 나타날 때 검색 상자에 포커스를 준다. desktop은 늘 검색 상자를 보이므로 이 값을 쓰지 않는다
   */
  search?: ExplorerAddressRowSearch;
  /** 피그마 Breadcrumb의 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다 */
  children?: ReactNode;
  /** 피그마 Breadcrumb의 `Location icon` 인스턴스 교체 속성. 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다 */
  locationIcon: ReactNode;
  /** 뒤로 버튼을 눌렀을 때 */
  onBack?: () => void;
  /** 뒤로 갈 곳이 없어 뒤로 버튼을 비활성(IconButton disabled)으로 둘지 */
  backDisabled?: boolean;
  /** 앞으로 갈 곳이 없어 앞으로 버튼을 비활성으로 둘지. desktop만 보인다 */
  forwardDisabled?: boolean;
  /** 상위 위치가 없어 위로 버튼을 비활성으로 둘지. desktop만 보인다 */
  upDisabled?: boolean;
  /** 앞으로 버튼을 눌렀을 때. desktop만 보인다 */
  onForward?: () => void;
  /** 위로 버튼을 눌렀을 때. desktop만 보인다 */
  onUp?: () => void;
  /** 새로고침 버튼을 눌렀을 때. desktop만 보인다 */
  onRefresh?: () => void;
  /** 검색 상자의 안내 글자. desktop과 mobile 검색 줄에 보인다. 탐색기 창은 `<현재 폴더> 검색`처럼 덮어쓴다 */
  searchPlaceholder?: string;
  /** 검색 상자의 입력값. 주면 쓰는 곳이 값을 정한다(위치를 옮기면 비우는 등). desktop과 mobile 검색 줄에 보인다 */
  searchValue?: string;
  /** 검색 상자에 입력할 때. desktop과 mobile 검색 줄에 보인다 */
  onSearchChange?: (value: string) => void;
  /** 검색 버튼을 눌렀을 때. mobile 주소 줄(search closed)만 보인다 */
  onSearch?: () => void;
  /** 검색 줄의 ← 버튼을 눌렀을 때. mobile 검색 줄(search open)만 보인다 */
  onSearchClose?: () => void;
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
    search = 'closed',
    children,
    locationIcon,
    onBack: handleBack,
    backDisabled: isBackDisabled = false,
    forwardDisabled: isForwardDisabled = false,
    upDisabled: isUpDisabled = false,
    onForward: handleForward,
    onUp: handleUp,
    onRefresh: handleRefresh,
    searchPlaceholder = '검색',
    searchValue,
    onSearchChange: handleSearchChange,
    onSearch: handleSearch,
    onSearchClose: handleSearchClose,
    className,
    ...divProps
  } = props;
  const isDesktop = device === 'desktop';
  const rowClassName = cn('flex items-center gap-4 overflow-clip px-8 py-6', className);
  /**
   * 검색 상자 입력을 쓰는 곳에 문자열로 알린다.
   * @param event 입력 이벤트
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    handleSearchChange?.(event.target.value);
  }

  if (!isDesktop && search === 'open') {
    // @codocs [[파일 탐색기:폴더 안 검색]]
    return (
      <div {...divProps} className={rowClassName}>
        <IconButton
          variant="subtle"
          label="검색 닫기"
          icon="icons/ic_fluent_arrow_left_20_regular.svg"
          onClick={handleSearchClose}
        />
        <SearchBox
          aria-label="검색"
          placeholder={searchPlaceholder}
          value={searchValue}
          className="min-w-px flex-1"
          // 검색 줄이 나타나면 검색 상자에 포커스를 준다(피그마 SearchBox State=Focused).
          ref={focusOnMount}
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div {...divProps} className={rowClassName}>
      <IconButton
        variant="subtle"
        label="뒤로"
        icon="icons/ic_fluent_arrow_left_20_regular.svg"
        disabled={isBackDisabled}
        onClick={handleBack}
      />
      {isDesktop ? (
        <>
          <IconButton
            variant="subtle"
            label="앞으로"
            icon="icons/ic_fluent_arrow_right_20_regular.svg"
            disabled={isForwardDisabled}
            onClick={handleForward}
          />
          <IconButton
            variant="subtle"
            label="위로"
            icon="icons/ic_fluent_arrow_up_20_regular.svg"
            disabled={isUpDisabled}
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
          value={searchValue}
          className="w-240 shrink-0"
          onChange={handleChange}
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

/**
 * 입력칸이 붙을 때 한 번 포커스를 준다. 모듈 함수라 다시 그려도 ref가 바뀌지 않아 다시 부르지 않는다.
 * @param input 붙은 입력칸(떨어질 때는 null)
 */
function focusOnMount(input: HTMLInputElement | null): void {
  input?.focus();
}
