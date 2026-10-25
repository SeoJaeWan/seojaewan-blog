import type { JSX, ReactNode } from 'react';

import { Asset, SearchBox, SystemTray, Taskbar, TaskbarButton } from '@seojaewan/design-system';

export type TaskbarDefaultSearch = 'box' | 'button';

type TaskbarDefaultProps = {
  /** 피그마 Search. box는 검색 입력칸(넓은 화면), button은 검색 아이콘 버튼(좁은 화면)이다 */
  search?: TaskbarDefaultSearch;
  /** 앱 버튼 자리. 고정한 앱과 실행 중인 앱의 `TaskbarAppButton`(또는 그 버튼을 품은 `TaskbarAppMenu`·`TaskbarAppPreview`)을 넣는다 */
  apps?: ReactNode;
  /** 시계 위 줄(시간). 피그마 SystemTray Time */
  time: string;
  /** 시계 아래 줄(날짜). 피그마 SystemTray Date */
  date: string;
  /** 바깥 배치 클래스. 너비는 쓰는 곳이 정한다 */
  className?: string;
};

/**
 * 화면 아래 작업 표시줄(피그마 조립 `Taskbar/Default`)을 그린다. Taskbar 가운데 자리에 Start 버튼, 검색, 앱 버튼 자리를 두고
 * 오른쪽 자리에 시계(SystemTray)를 둔다. 앱 버튼은 앱마다 메뉴·미리보기를 품으므로 쓰는 쪽이 넣는다.
 * Start·검색 패널 열기, 시계 갱신 같은 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[작업 표시줄:구성]]
 * @param props
 */
export function TaskbarDefault(props: TaskbarDefaultProps): JSX.Element {
  const { search = 'box', apps, time, date, className } = props;
  return (
    <Taskbar
      className={className}
      center={
        <>
          <TaskbarButton
            label="시작"
            icon={<Asset name="illustrations/logo-windows.svg" className="size-full" />}
          />
          {search === 'box' ? (
            <SearchBox
              appearance="taskbar"
              placeholder="검색"
              aria-label="검색"
              className="w-220 shrink-0"
            />
          ) : (
            <TaskbarButton
              label="검색"
              icon={
                <Asset
                  name="icons/ic_fluent_search_20_regular.svg"
                  className="size-full text-text-fill-primary"
                />
              }
            />
          )}
          {apps}
        </>
      }
      right={<SystemTray time={time} date={date} className="shrink-0" />}
    />
  );
}
