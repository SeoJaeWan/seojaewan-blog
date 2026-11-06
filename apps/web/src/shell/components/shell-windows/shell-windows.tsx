import type { JSX, ReactNode } from 'react';

import type { ChromePreload } from '@/features/chrome/chrome-window-layer';
import { renderTaskbarAppIcon } from '@/features/taskbar/render-taskbar-app-icon';
import { WindowLayer } from '@/features/window/window-layer';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';
import { useAppWindowRenderer } from '@/shell/hooks/use-app-window-renderer/use-app-window-renderer';
import { useAppWindowTitle } from '@/shell/hooks/use-app-window-title/use-app-window-title';

type ShellWindowsProps = {
  chromePreload?: ChromePreload;
  entryWindow?: OpenWindow | null;
};

/**
 * 작업 공간의 창 층을 그린다. 창 층(`features/window`)은 앱을 모르므로 앱별 창 조립을 고르는 함수를 넘긴다.
 * 주소로 처음 들어왔으면 서버가 그릴 첫 창과 서버가 읽은 글을 함께 넘겨, 첫 HTML에 그 창이 들어가게 한다.
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param props 컴포넌트 속성
 * @param props.chromePreload 서버가 읽어 넘긴 글 색인과 처음 들어온 글의 본문
 * @param props.entryWindow 서버가 그릴 첫 진입 창. 저장소에 창이 열리면 그 창으로 이어 그린다
 * @returns 창 층
 */
export function ShellWindows({ chromePreload, entryWindow }: ShellWindowsProps): JSX.Element {
  const renderWindow = useAppWindowRenderer(chromePreload);
  const getWindowTitle = useAppWindowTitle(chromePreload?.posts);
  return (
    <WindowLayer
      renderWindow={renderWindow}
      getWindowTitle={getWindowTitle}
      renderWindowIcon={renderWindowIcon}
      entryWindow={entryWindow}
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
