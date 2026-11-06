import type { ReactNode } from 'react';

import { type ChromePreload, ChromeWindowLayer } from '@/features/chrome/chrome-window-layer';
import { ExplorerWindowLayer } from '@/features/file-explorer/explorer-window-layer';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import type { OpenWindow, WindowFrameControls } from '@/shared/utils/window-rules/window-rules';

/**
 * 열린 창의 앱 창을 고른다. 창 층(`features/window`)은 앱을 모르므로 shell이 이 함수를 넘긴다(앱 등록표).
 * 창 내용을 저장소에서 읽어 그리는 일은 각 앱 기능의 층 컴포넌트(탐색기, Chrome)가 한다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @codocs [[작업 표시줄:앱 버튼]]
 * @param window 열린 창
 * @param controls 창 층이 넘기는 창 동작 속성
 * @param device 화면 방식
 * @param chromePreload 서버가 읽어 넘긴 글 색인과 처음 들어온 글의 본문. Chrome 창에 넘긴다
 * @returns 앱 창
 */
export function renderAppWindow(
  window: OpenWindow,
  controls: WindowFrameControls,
  device: DeviceVariant,
  chromePreload?: ChromePreload,
): ReactNode {
  const { content } = window;
  if (content.app === 'chrome') {
    return (
      <ChromeWindowLayer
        windowId={window.id}
        content={content}
        controls={controls}
        device={device}
        preload={chromePreload}
      />
    );
  }
  return (
    <ExplorerWindowLayer
      windowId={window.id}
      content={content}
      controls={controls}
      device={device}
    />
  );
}
