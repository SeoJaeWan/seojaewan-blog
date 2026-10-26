'use client';

import type { JSX } from 'react';

import { useOpenApp } from '@/core/window/window';
import { useWorkspaceStore } from '@/core/workspace/workspace';
import type { DesktopIcon } from '@/features/desktop/desktop';
import { INITIAL_DESKTOP_ITEMS } from '@/features/desktop/desktop';
import { StartMenuLayer, useStartMenuStore } from '@/features/start-menu/start-menu';
import { TaskbarDefault, useClock } from '@/features/taskbar/taskbar';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { DesktopScene } from '@/shell/components/desktop-scene/desktop-scene';
import { RestartScreen } from '@/shell/components/restart-screen/restart-screen';
import { ShellTaskbarApps } from '@/shell/components/shell-taskbar-apps/shell-taskbar-apps';
import { ShellWindows } from '@/shell/components/shell-windows/shell-windows';

// 좁은 화면은 작업 표시줄에 검색 입력칸 대신 검색 버튼을 둔다(피그마 Taskbar/Default Search).
const TASKBAR_SEARCHES = { desktop: 'box', mobile: 'button' } as const;

// 데스크톱은 아이콘을 더블클릭해서, 모바일은 탭해서 연다.
const ICON_OPEN_GESTURES = { desktop: 'double-click', mobile: 'click' } as const;

/**
 * 앱 화면 전체(작업 공간)를 그린다. 데스크톱 하위 트리와 그 위를 덮는 재부팅 화면이다.
 * 다시 시작하면 데스크톱 하위 트리의 `key`(세대)를 바꿔 새로고침 없이 다시 마운트한다. 그래서 저장소 밖의 지역 상태도 사라진다.
 * 세대와 다시 시작 단계는 다시 마운트하는 트리 바깥의 저장소(`useWorkspaceStore`)가 가져 다시 마운트한 뒤에도 남는다.
 * @codocs [[작업 공간:다시 시작]]
 * @returns 작업 공간
 */
export function Shell(): JSX.Element {
  const device = useDevice();
  const generation = useWorkspaceStore((state) => state.generation);
  return (
    <main aria-label="바탕화면" className="fixed inset-0 overflow-hidden">
      <ShellDesktop key={generation} />
      <RestartScreen device={device} />
    </main>
  );
}

/**
 * 데스크톱 하위 트리를 그린다. 화면을 꽉 채우는 바탕화면(`Desktop/Scene`) 위에 아래에서부터 차례로
 * 배경화면·아이콘, 창 층, 패널 층(Start·검색), 작업 표시줄을 쌓는다. 작업 표시줄이 맨 위라 패널은 그 뒤에서 올라온다.
 * 시계와 화면 방식은 기기에 따라 달라, 서버 HTML과 수화 첫 렌더는 빈 시계·데스크톱 방식으로 그리고 마운트 뒤에 바꾼다.
 * 창 층은 창 저장소의 열린 창을 그리고, 작업 표시줄 앱 버튼과 바탕화면 `Blog` 폴더, Start 항목이 창을 연다.
 * Start 버튼과 검색칸은 패널 층(Start·검색 패널)을 열고 닫는다. 각 층은 비어 있는 곳의 클릭을 아래(아이콘)로 넘긴다.
 * @codocs [[작업 표시줄:구성]]
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[모바일:차이]]
 * @returns 데스크톱 하위 트리
 */
function ShellDesktop(): JSX.Element {
  const device = useDevice();
  const clock = useClock();
  const openApp = useOpenApp();

  /**
   * 바탕화면 아이콘을 열면 그 항목을 연다. 폴더(`Blog`)는 새 탐색기 창이다. 휴지통과 외부 링크는 다음 단계에서 붙인다.
   * @param icon 연 아이콘
   */
  function handleIconOpen(icon: DesktopIcon): void {
    if (icon.kind === 'folder') {
      openApp('file-explorer');
    }
  }

  const openPanel = useStartMenuStore((state) => state.openPanel);
  const toggleStart = useStartMenuStore((state) => state.toggleStart);
  const openSearch = useStartMenuStore((state) => state.openSearch);
  const toggleSearch = useStartMenuStore((state) => state.toggleSearch);
  const restart = useWorkspaceStore((state) => state.restart);

  /**
   * Start 메뉴에서 앱 항목을 열면 그 앱 창을 연다. Start 메뉴는 패널 층이 닫는다.
   * @param app 연 앱
   */
  function handleOpenApp(app: Parameters<typeof openApp>[0]): void {
    openApp(app);
  }

  /** Start 버튼을 누르면 Start 메뉴를 열거나 닫는다. */
  function handleStartClick(): void {
    toggleStart();
  }

  /** 전원 메뉴의 `다시 시작`을 누르면 다시 시작한다. 재부팅 화면과 초기화는 shell 최상위가 맡는다. */
  function handleRestart(): void {
    restart();
  }

  /** 좁은 화면의 검색 버튼을 누르면 검색 패널을 열거나 닫는다. */
  function handleSearchClick(): void {
    toggleSearch();
  }

  return (
    <DesktopScene
      className="size-full"
      icons={INITIAL_DESKTOP_ITEMS}
      iconOpenGesture={ICON_OPEN_GESTURES[device]}
      onIconOpen={handleIconOpen}
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
          apps={<ShellTaskbarApps />}
        />
      }
    >
      {/* 창 층(data-layer="windows"). 아이콘 위, 패널 아래다 */}
      <ShellWindows />
      {/* 패널 층(Start·검색). 창보다 위, 작업 표시줄보다 아래다 */}
      <div data-layer="panels" className="pointer-events-none absolute inset-0">
        <StartMenuLayer device={device} onOpenApp={handleOpenApp} onRestart={handleRestart} />
      </div>
    </DesktopScene>
  );
}
