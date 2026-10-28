import { create } from 'zustand';

import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';
import type {
  SnapZone,
  WindowApp,
  WindowBounds,
  WindowContent,
  WindowState,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import {
  closeWindow,
  detachWindow,
  focusWindow,
  INITIAL_WINDOW_STATE,
  maximizeWindow,
  minimizeWindow,
  openPostInChrome,
  openWindow,
  restoreFromMaximize,
  restoreWindow,
  setWindowBounds,
  setWindowContent,
  snapWindow,
  toggleMaximizeWindow,
} from '@/shared/utils/window-rules/window-rules';

/**
 * 창을 끌거나 크기를 조절하는 중인지. 그동안에는 최대화·스냅 모션을 끈다([[피그마 연동:모션 클래스]]).
 * 끄는 동안의 자리는 저장소에 두지 않고 창 요소에 바로 그리며, 놓을 때 `setBounds`·`snap`·`maximize`로 반영한다.
 */
export type WindowInteraction = 'drag' | 'resize' | null;

/** 저장소에만 있는 화면 상태 */
type WindowUiState = {
  /** 끌기·크기 조절 중인지 */
  interaction: WindowInteraction;
};

/** 창 저장소의 조작 */
type WindowActions = {
  /** 새 창을 열고 맨 앞으로 둔다. 창 내용을 주지 않으면 앱을 처음 열 때의 내용이다. 연 창의 id를 돌려준다 */
  open: (app: WindowApp, workArea: WindowWorkArea, content?: WindowContent) => string;
  /**
   * 글을 가장 최근 Chrome 창의 새 탭(없으면 새 Chrome 창)으로 연다. `isSameTab`(모바일)이면 그 창의 고른 탭에서 연다.
   * 글을 연 창의 id를 돌려준다
   */
  openPost: (slug: string, workArea: WindowWorkArea, isSameTab?: boolean) => string;
  /** 창을 맨 앞으로 가져온다 */
  focus: (id: string) => void;
  /** 창을 바로 지운다 */
  close: (id: string) => void;
  /** 창을 최소화한다 */
  minimize: (id: string) => void;
  /** 창을 복원하고 맨 앞으로 가져온다 */
  restore: (id: string) => void;
  /** 창을 최대화한다 */
  maximize: (id: string) => void;
  /** 최대화한 창을 바로 앞 모습으로 복원한다 */
  restoreFromMaximize: (id: string) => void;
  /** 최대화했으면 복원하고, 아니면 최대화한다(제목 표시줄 더블클릭) */
  toggleMaximize: (id: string) => void;
  /** 창을 스냅 칸에 맞추고 맨 앞으로 가져온다 */
  snap: (id: string, zone: SnapZone) => void;
  /** 떠 있는 창의 자리를 바꾼다(끌어서 옮기거나 크기를 조절한 뒤 놓았을 때) */
  setBounds: (id: string, bounds: WindowBounds) => void;
  /** 최대화·스냅한 창을 끌어서 떼어 떠 있는 창으로 돌린다 */
  detach: (id: string, bounds: WindowBounds) => void;
  /** 창 내용(탐색기 탭과 위치 기록 등)을 바꾼다 */
  setContent: (id: string, content: WindowContent) => void;
  /** 끌기·크기 조절을 시작하거나(drag·resize) 끝낸다(null) */
  setInteraction: (interaction: WindowInteraction) => void;
  /** 창을 모두 닫은 처음 상태로 돌린다(다시 시작) */
  reset: () => void;
};

/**
 * 열린 창과 창 순서를 갖는 화면 저장소다. 규칙은 `window-rules.ts`의 순수 함수에 있고, 여기서는 그 함수만 부른다.
 * 열린 창은 브라우저에 저장하지 않으므로 `persist`를 쓰지 않는다. 다시 시작하면 처음 상태로 돌아가도록 초기화 함수를 등록한다.
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[작업 공간:다시 시작]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 */
export const useWindowStore = create<WindowState & WindowUiState & WindowActions>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @param get 지금 상태를 읽는 함수
   * @returns 처음 상태와 조작
   */
  (set, get) => ({
    ...INITIAL_WINDOW_STATE,
    interaction: null,
    open: (app, workArea, content) => {
      const result = openWindow(get(), app, workArea, content);
      set(result.state);
      return result.id;
    },
    openPost: (slug, workArea, isSameTab) => {
      const result = openPostInChrome(get(), slug, workArea, isSameTab);
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
    maximize: (id) => {
      set((state) => maximizeWindow(state, id));
    },
    restoreFromMaximize: (id) => {
      set((state) => restoreFromMaximize(state, id));
    },
    toggleMaximize: (id) => {
      set((state) => toggleMaximizeWindow(state, id));
    },
    snap: (id, zone) => {
      set((state) => snapWindow(state, id, zone));
    },
    setBounds: (id, bounds) => {
      set((state) => setWindowBounds(state, id, bounds));
    },
    detach: (id, bounds) => {
      set((state) => detachWindow(state, id, bounds));
    },
    setContent: (id, content) => {
      set((state) => setWindowContent(state, id, content));
    },
    setInteraction: (interaction) => {
      set({ interaction });
    },
    reset: () => {
      set({ ...INITIAL_WINDOW_STATE, interaction: null });
    },
  }),
);

registerStoreReset(() => {
  useWindowStore.getState().reset();
});
