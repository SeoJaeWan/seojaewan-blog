import type { ComponentProps, JSX, MouseEventHandler, ReactNode } from 'react';

import { Asset, SearchBox, SystemTray, Taskbar, TaskbarButton } from '@seojaewan/design-system';

export type TaskbarDefaultSearch = 'box' | 'button';

type TaskbarDefaultProps = {
  search?: TaskbarDefaultSearch;
  apps?: ReactNode;
  time: string;
  date: string;
  onStartClick?: MouseEventHandler<HTMLButtonElement>;
  isStartOpen?: boolean;
  searchBoxProps?: Omit<
    ComponentProps<typeof SearchBox>,
    'variant' | 'placeholder' | 'aria-label' | 'className'
  >;
  onSearchClick?: MouseEventHandler<HTMLButtonElement>;
  isSearchOpen?: boolean;
};

/**
 * 화면 아래 작업 표시줄(피그마 조립 `Taskbar/Default`)을 그린다. Taskbar 가운데 자리에 Start 버튼, 검색, 앱 버튼 자리를 두고
 * 오른쪽 자리에 시계(SystemTray)를 둔다. 앱 버튼은 앱마다 메뉴·미리보기를 품으므로 쓰는 쪽이 넣는다.
 * 동작은 쓰는 곳이 prop으로 넣는다(Start 버튼 클릭, 검색칸 포커스, 시계 글자). prop을 주지 않으면 피그마 조립 모습 그대로다.
 * Start 버튼과 검색칸·검색 버튼에는 `data-panel-trigger`를 단다. 패널 층이 바깥 클릭으로 볼 때 이 둘을 빼기 위해서다
 * (누르면 패널을 열고 닫는 버튼이라 바깥 클릭으로 닫으면 다시 열려 버린다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[작업 표시줄:구성]]
 * @param props 컴포넌트 속성
 * @param props.search 피그마 Search. box는 검색 입력칸(넓은 화면), button은 검색 아이콘 버튼(좁은 화면)이다
 * @param props.apps 앱 버튼 자리. 고정한 앱과 실행 중인 앱의 `TaskbarAppButton`(또는 그 버튼을 품은 `TaskbarAppMenu`·`TaskbarAppPreview`)을 넣는다
 * @param props.time 시계 위 줄(시간). 피그마 SystemTray Time
 * @param props.date 시계 아래 줄(날짜). 피그마 SystemTray Date
 * @param props.isStartOpen Start 메뉴가 열려 있는지. Start 버튼의 `aria-expanded`가 된다. 주지 않으면 달지 않는다
 * @param props.searchBoxProps 검색 입력칸(search=box)에 넘기는 속성. 포커스하면 검색 패널을 여는 `onFocus` 등을 넣는다
 * @param props.isSearchOpen 검색 패널이 열려 있는지. 검색 버튼(search=button)의 `aria-expanded`가 된다. 주지 않으면 달지 않는다
 * @param props.onStartClick Start 버튼을 눌렀을 때 부른다. Start 메뉴를 열고 닫는 일은 쓰는 곳이 한다
 * @param props.onSearchClick 검색 버튼(search=button)을 눌렀을 때 부른다. 좁은 화면에서 검색 패널을 연다
 */
export function TaskbarDefault({
  search = 'box',
  apps,
  time,
  date,
  isStartOpen,
  searchBoxProps,
  isSearchOpen,
  onStartClick: handleStartClick,
  onSearchClick: handleSearchClick,
}: TaskbarDefaultProps): JSX.Element {
  return (
    <Taskbar
      center={
        <>
          <TaskbarButton
            data-panel-trigger
            label="시작"
            aria-expanded={isStartOpen}
            onClick={handleStartClick}
            icon={<Asset name="illustrations/logo-windows.svg" />}
          />
          {search === 'box' ? (
            // 돋보기 자리를 눌러도 검색칸으로 보도록 상자 전체를 감싼다. contents라 배치는 바뀌지 않는다.
            // 검색 패널 층은 data-search-panel-anchor가 달린 이 상자의 왼쪽 끝에 데스크톱 검색 패널을 맞춘다
            <div data-panel-trigger data-search-panel-anchor className="contents">
              <SearchBox
                {...searchBoxProps}
                variant="taskbar"
                placeholder="검색"
                aria-label="검색"
                className="w-size-search-box-taskbar-width shrink-shrink-none"
              />
            </div>
          ) : (
            <TaskbarButton
              data-panel-trigger
              label="검색"
              aria-expanded={isSearchOpen}
              onClick={handleSearchClick}
              icon={
                <Asset
                  name="icons/ic_fluent_search_20_regular.svg"
                  className="text-color-black-89"
                />
              }
            />
          )}
          {apps}
        </>
      }
      right={<SystemTray time={time} date={date} className="shrink-shrink-none" />}
    />
  );
}
