import { create } from 'zustand';

import { DEFAULT_ZOOM, zoomIn, zoomOut } from '@/features/chrome/utils/chrome-zoom/chrome-zoom';
import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';

/** Chrome 배율 저장소. 지금 배율과 바꾸는 동작이다 */
type ChromeZoomStore = {
  /** 페이지 본문 배율(%) */
  zoom: number;
  /** 한 단계 키운다 */
  zoomIn: () => void;
  /** 한 단계 줄인다 */
  zoomOut: () => void;
  /** 100%로 돌린다 */
  resetZoom: () => void;
};

/**
 * Chrome 페이지 본문의 배율을 담는 저장소. 실제 Chrome이 사이트마다 배율 하나를 기억하듯, 모든 Chrome 창과 탭이 같은 배율을 쓰도록
 * 창 밖에 둔다. 브라우저에 저장하지 않아 새 방문은 100%로 시작하고, 다시 시작해도 100%로 돌린다.
 * @codocs [[Chrome:확대/축소]]
 */
export const useChromeZoomStore = create<ChromeZoomStore>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @returns 처음 상태와 조작
   */
  (set) => ({
    zoom: DEFAULT_ZOOM,
    zoomIn: () => {
      set((state) => ({ zoom: zoomIn(state.zoom) }));
    },
    zoomOut: () => {
      set((state) => ({ zoom: zoomOut(state.zoom) }));
    },
    resetZoom: () => {
      set({ zoom: DEFAULT_ZOOM });
    },
  }),
);

registerStoreReset(() => {
  useChromeZoomStore.getState().resetZoom();
});
