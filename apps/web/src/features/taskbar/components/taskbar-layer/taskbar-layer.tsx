import type { JSX } from 'react';

import type { TaskbarAppsLayerProps } from '@/features/taskbar/components/taskbar-apps-layer/taskbar-apps-layer';
import { TaskbarAppsLayer } from '@/features/taskbar/components/taskbar-apps-layer/taskbar-apps-layer';
import { TaskbarDefault } from '@/features/taskbar/components/taskbar-default/taskbar-default';
import { useClock } from '@/features/taskbar/hooks/use-clock/use-clock';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { usePanelStore } from '@/shared/stores/panel-store/panel-store';

// 좁은 화면은 작업 표시줄에 검색 입력칸 대신 검색 버튼을 둔다(피그마 Taskbar/Default Search).
const TASKBAR_SEARCHES = { desktop: 'box', mobile: 'button' } as const;

/** 앱 버튼의 창 미리보기에 그릴 창 내용과 제목. 앱을 아는 쓰는 곳(앱 등록표)이 넘긴다 */
type TaskbarLayerProps = TaskbarAppsLayerProps;

/**
 * 작업 표시줄(`TaskbarDefault`)을 패널 저장소, 창 저장소(앱 버튼), 시계에 잇는 층이다.
 * Start 버튼은 Start 메뉴를, 검색칸(넓은 화면)·검색 버튼(좁은 화면)은 검색 패널을 열고 닫는다. 패널은 패널 층(Start 메뉴 기능)이 그린다.
 * 시계와 화면 방식은 기기에 따라 달라, 서버 HTML과 수화 첫 렌더는 빈 시계·데스크톱 방식으로 그리고 마운트 뒤에 바꾼다.
 * @codocs [[작업 표시줄:구성]]
 * @codocs [[작업 표시줄:시계]]
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[모바일:차이]]
 * @param props
 * @returns 작업 표시줄
 */
export function TaskbarLayer(props: TaskbarLayerProps): JSX.Element {
  const { renderWindow, getWindowTitle } = props;
  const device = useDevice();
  const clock = useClock();
  const openPanel = usePanelStore((state) => state.openPanel);
  const toggleStart = usePanelStore((state) => state.toggleStart);
  const openSearch = usePanelStore((state) => state.openSearch);
  const toggleSearch = usePanelStore((state) => state.toggleSearch);

  /** Start 버튼을 누르면 Start 메뉴를 열거나 닫는다. */
  function handleStartClick(): void {
    toggleStart();
  }

  /** 좁은 화면의 검색 버튼을 누르면 검색 패널을 열거나 닫는다. */
  function handleSearchClick(): void {
    toggleSearch();
  }

  return (
    <TaskbarDefault
      search={TASKBAR_SEARCHES[device]}
      time={clock?.time ?? ''}
      date={clock?.date ?? ''}
      isStartOpen={openPanel === 'start'}
      onStartClick={handleStartClick}
      // 포커스한 채 패널을 닫았다가(Esc) 다시 누르면 포커스가 바뀌지 않으므로 클릭에도 연다
      searchBoxProps={{ onFocus: openSearch, onClick: openSearch }}
      isSearchOpen={openPanel === 'search'}
      onSearchClick={handleSearchClick}
      apps={<TaskbarAppsLayer renderWindow={renderWindow} getWindowTitle={getWindowTitle} />}
    />
  );
}
