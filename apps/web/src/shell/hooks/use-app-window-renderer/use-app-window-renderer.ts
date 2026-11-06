import type { ReactNode } from 'react';

import type { ChromePreload } from '@/features/chrome/chrome-window-layer';
import { toDeviceVariant, useDevice } from '@/shared/hooks/use-device/use-device';
import type {
  OpenWindow,
  RenderWindow,
  WindowFrameControls,
} from '@/shared/utils/window-rules/window-rules';
import { renderAppWindow } from '@/shell/components/app-windows/app-windows';

/**
 * 지금 화면 방식으로 앱 창을 그리는 함수(앱 등록표)를 돌려준다.
 * 창 층과 작업 표시줄 창 미리보기는 앱을 모르므로 shell이 이 함수를 넘긴다.
 * @param chromePreload 서버가 읽어 넘긴 글 색인과 처음 들어온 글의 본문. Chrome 창에 넘긴다
 * @returns 열린 창과 창 동작 속성을 받아 앱 창을 그리는 함수
 */
export function useAppWindowRenderer(chromePreload?: ChromePreload): RenderWindow {
  const device = toDeviceVariant(useDevice());
  /**
   * 열린 창의 앱 창을 그린다.
   * @param target 열린 창
   * @param controls 창 층이 넘기는 창 동작 속성
   * @returns 앱 창
   */
  function renderWindow(target: OpenWindow, controls: WindowFrameControls): ReactNode {
    return renderAppWindow(target, controls, device, chromePreload);
  }
  return renderWindow;
}
