import { useEffect } from 'react';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { getActiveChromePage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import { getFrontWindowId, type WindowState } from '@/shared/utils/window-rules/window-rules';

// 글을 보는 Chrome 탭이 맨 앞이 아닐 때의 브라우저 주소다.
const HOME_PATH = '/';

/**
 * 브라우저 주소창이 글만 따라가게 한다. 맨 앞 창이 글을 보는 Chrome 탭이면 그 글의 주소(`/posts/<slug>`), 그 밖은 `/`다.
 * 주소만 바꾸고 브라우저 기록에는 쌓지 않는다(`history.replaceState`). 다시 시작하면 창이 모두 닫혀 `/`로 돌아간다.
 * 창 하나마다가 아니라 화면 전체에서 한 번만 써야 해서(작업 표시줄 미리보기·Snap Assist가 창을 여러 번 그린다) shell이 부른다.
 * @codocs [[창 동작:브라우저 주소]]
 */
export function useBrowserAddressSync(): void {
  const path = useWindowStore(getBrowserPath);

  useEffect(
    /** 브라우저 주소가 다르면 기록을 쌓지 않고 바꾼다. */
    () => {
      if (window.location.pathname !== path) {
        window.history.replaceState(window.history.state, '', path);
      }
    },
    [path],
  );
}

/**
 * 창 상태에 맞는 브라우저 주소(경로).
 * @codocs [[창 동작:브라우저 주소]]
 * @param state 창 상태
 * @returns 경로
 */
export function getBrowserPath(state: Pick<WindowState, 'windows' | 'order'>): string {
  const frontId = getFrontWindowId(state);
  const content = frontId === null ? undefined : state.windows[frontId]?.content;
  if (content?.app !== 'chrome') {
    return HOME_PATH;
  }
  const page = getActiveChromePage(content);
  return page.kind === 'post' ? `/posts/${encodeURIComponent(page.slug)}` : HOME_PATH;
}
