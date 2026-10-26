'use client';

import type { JSX } from 'react';

import { useWorkspaceStore } from '@/core/workspace/workspace';
import { DesktopIconsLayer } from '@/features/desktop/desktop';
import { StartMenuLayer } from '@/features/start-menu/start-menu';
import { TaskbarLayer } from '@/features/taskbar/taskbar';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { DesktopScene } from '@/shell/components/desktop-scene/desktop-scene';
import { RestartScreen } from '@/shell/components/restart-screen/restart-screen';
import { ShellTaskbarApps } from '@/shell/components/shell-taskbar-apps/shell-taskbar-apps';
import { ShellWindows } from '@/shell/components/shell-windows/shell-windows';

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
 * 각 층은 자기 기능의 층 컴포넌트가 저장소를 직접 읽고 불러 그리므로, shell은 층을 순서대로 쌓기만 하고 기능 사이를 콜백으로 잇지 않는다.
 * 창 안에 무엇을 그릴지(앱 등록표)는 shell이 창 층과 작업 표시줄 창 미리보기에 넘긴다. 각 층은 비어 있는 곳의 클릭을 아래(아이콘)로 넘긴다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @codocs [[기술 스택:상태 관리]]
 * @returns 데스크톱 하위 트리
 */
function ShellDesktop(): JSX.Element {
  return (
    <DesktopScene
      className="size-full"
      icons={<DesktopIconsLayer />}
      taskbar={<TaskbarLayer apps={<ShellTaskbarApps />} />}
    >
      {/* 창 층(data-layer="windows"). 아이콘 위, 패널 아래다 */}
      <ShellWindows />
      {/* 패널 층(Start·검색). 창보다 위, 작업 표시줄보다 아래다 */}
      <div data-layer="panels" className="pointer-events-none absolute inset-0">
        <StartMenuLayer />
      </div>
    </DesktopScene>
  );
}
