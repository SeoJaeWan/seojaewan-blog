import type { JSX, ReactNode } from 'react';

import { renderTaskbarAppIcon } from '@/features/taskbar/taskbar';
import type { OpenWindow, WindowFrameControls } from '@/features/window/window';
import { WindowLayer } from '@/features/window/window';
import { useDevice } from '@/shared/viewport/use-device';

import { getAppWindowTitle, renderAppWindow } from './app-windows';

/**
 * 작업 공간의 창 층을 그린다. 창 층(`features/window`)은 앱을 모르므로 앱별 창 조립을 고르는 함수를 넘긴다.
 * @returns 창 층
 */
export function WorkspaceWindows(): JSX.Element {
  const device = useDevice();
  /**
   * 열린 창의 앱 창 조립을 그린다.
   * @param target 열린 창
   * @param controls 창 층이 넘기는 창 동작 속성
   * @returns 앱 창
   */
  function renderWindow(target: OpenWindow, controls: WindowFrameControls): ReactNode {
    return renderAppWindow(target, controls, device);
  }
  return (
    <WindowLayer
      renderWindow={renderWindow}
      getWindowTitle={getAppWindowTitle}
      renderWindowIcon={renderWindowIcon}
    />
  );
}

/**
 * 창 앱 아이콘을 그린다. Snap Assist 카드 머리글에 쓴다.
 * @param target 열린 창
 * @returns 앱 아이콘
 */
function renderWindowIcon(target: OpenWindow): ReactNode {
  return renderTaskbarAppIcon(target.app);
}
