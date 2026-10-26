import type { JSX, ReactNode } from 'react';

import { renderTaskbarAppIcon } from '@/features/taskbar/taskbar';
import { WindowLayer } from '@/features/window/window';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';
import { getAppWindowTitle } from '@/shell/components/app-windows/app-windows';
import { useAppWindowRenderer } from '@/shell/hooks/use-app-window-renderer/use-app-window-renderer';

/**
 * 작업 공간의 창 층을 그린다. 창 층(`features/window`)은 앱을 모르므로 앱별 창 조립을 고르는 함수를 넘긴다.
 * @returns 창 층
 */
export function ShellWindows(): JSX.Element {
  const renderWindow = useAppWindowRenderer();
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
