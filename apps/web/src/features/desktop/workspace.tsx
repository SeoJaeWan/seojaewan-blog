'use client';

import type { JSX } from 'react';

import { StartMenuLayer, useStartMenuStore } from '@/features/start-menu/start-menu';
import { TaskbarAppButton, TaskbarDefault, useClock } from '@/features/taskbar/taskbar';
import { useDevice } from '@/shared/viewport/use-device';

import { INITIAL_DESKTOP_ITEMS } from './desktop-items';
import { DesktopScene } from './desktop-scene';

// 좁은 화면은 작업 표시줄에 검색 입력칸 대신 검색 버튼을 둔다(피그마 Taskbar/Default Search).
const TASKBAR_SEARCHES = { desktop: 'box', mobile: 'button' } as const;

/**
 * 앱 화면 전체(작업 공간)를 그린다. 화면을 꽉 채우는 바탕화면(`Desktop/Scene`) 위에 아래에서부터 차례로
 * 배경화면·아이콘, 창 층, 패널 층(Start·검색), 작업 표시줄을 쌓는다. 작업 표시줄이 맨 위라 패널은 그 뒤에서 올라온다.
 * 시계와 화면 방식은 기기에 따라 달라, 서버 HTML과 수화 첫 렌더는 빈 시계·데스크톱 방식으로 그리고 마운트 뒤에 바꾼다.
 * Start 버튼과 검색칸은 패널 층(Start·검색 패널)을 열고 닫는다. 창은 자리만 둔다. 각 층은 비어 있는 곳의 클릭을 아래(아이콘)로 넘긴다.
 * @codocs [[작업 표시줄:구성]]
 * @codocs [[모바일:차이]]
 * @returns 작업 공간
 */
export function Workspace(): JSX.Element {
  const device = useDevice();
  const clock = useClock();
  const openPanel = useStartMenuStore((state) => state.openPanel);
  const toggleStart = useStartMenuStore((state) => state.toggleStart);
  const openSearch = useStartMenuStore((state) => state.openSearch);
  const toggleSearch = useStartMenuStore((state) => state.toggleSearch);

  /** Start 버튼을 누르면 Start 메뉴를 열거나 닫는다. */
  function handleStartClick(): void {
    toggleStart();
  }

  /** 좁은 화면의 검색 버튼을 누르면 검색 패널을 열거나 닫는다. */
  function handleSearchClick(): void {
    toggleSearch();
  }

  return (
    <main aria-label="바탕화면" className="fixed inset-0 overflow-hidden">
      <DesktopScene
        className="size-full"
        icons={INITIAL_DESKTOP_ITEMS}
        taskbar={
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
            apps={
              <>
                <TaskbarAppButton app="file-explorer" />
                <TaskbarAppButton app="chrome" />
              </>
            }
          />
        }
      >
        {/* 창 층. 열린 창은 다음 단계에서 넣는다 */}
        <div data-layer="windows" className="pointer-events-none absolute inset-0" />
        {/* 패널 층(Start·검색). 창보다 위, 작업 표시줄보다 아래다 */}
        <div data-layer="panels" className="pointer-events-none absolute inset-0">
          <StartMenuLayer device={device} />
        </div>
      </DesktopScene>
    </main>
  );
}
