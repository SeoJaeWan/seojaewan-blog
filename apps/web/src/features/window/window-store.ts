import { create } from 'zustand';

import type { WindowApp, WindowState, WindowWorkArea } from './window-rules';
import {
  closeWindow,
  focusWindow,
  INITIAL_WINDOW_STATE,
  minimizeWindow,
  openWindow,
  restoreWindow,
} from './window-rules';

/** 창 저장소의 조작 */
type WindowActions = {
  /** 새 창을 열고 맨 앞으로 둔다. 연 창의 id를 돌려준다 */
  open: (app: WindowApp, workArea: WindowWorkArea) => string;
  /** 창을 맨 앞으로 가져온다 */
  focus: (id: string) => void;
  /** 창을 바로 지운다 */
  close: (id: string) => void;
  /** 창을 최소화한다 */
  minimize: (id: string) => void;
  /** 창을 복원하고 맨 앞으로 가져온다 */
  restore: (id: string) => void;
  /** 창을 모두 닫은 처음 상태로 돌린다(다시 시작) */
  reset: () => void;
};

/**
 * 열린 창과 창 순서를 갖는 화면 저장소다. 규칙은 `window-rules.ts`의 순수 함수에 있고, 여기서는 그 함수만 부른다.
 * 열린 창은 브라우저에 저장하지 않으므로 `persist`를 쓰지 않는다.
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 */
export const useWindowStore = create<WindowState & WindowActions>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @param get 지금 상태를 읽는 함수
   * @returns 처음 상태와 조작
   */
  (set, get) => ({
    ...INITIAL_WINDOW_STATE,
    open: (app, workArea) => {
      const result = openWindow(get(), app, workArea);
      set(result.state);
      return result.id;
    },
    focus: (id) => {
      set((state) => focusWindow(state, id));
    },
    close: (id) => {
      set((state) => closeWindow(state, id));
    },
    minimize: (id) => {
      set((state) => minimizeWindow(state, id));
    },
    restore: (id) => {
      set((state) => restoreWindow(state, id));
    },
    reset: () => {
      set(INITIAL_WINDOW_STATE);
    },
  }),
);
