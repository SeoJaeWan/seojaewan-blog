import { create, type StoreApi } from 'zustand';

import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';
import type { PanelKind } from '@/shared/utils/panel-rules/panel-rules';
import { moveSearchSelection } from '@/shared/utils/search-rules/search-rules';

/** 패널 하나의 검색어와 결과에서 고른 차례 */
export type PanelSearch = {
  /** 검색어 */
  query: string;
  /** 결과 화면에서 고른 항목의 차례(보이는 차례). 검색어가 바뀌면 최고 일치(0)로 돌아간다 */
  selectedIndex: number;
};

/** 검색 저장소. 패널마다의 검색어와 고른 차례, 바꾸는 동작이다 */
export type SearchStore = {
  /**
   * 패널마다의 검색어. Start(start)는 Start 위쪽 검색칸, 검색 패널(search)은 작업 표시줄 검색칸과 모바일 검색 패널 입력칸이 쓴다
   */
  panels: Readonly<Record<PanelKind, PanelSearch>>;
  /** 그 패널의 검색어를 바꾼다. 고른 항목은 최고 일치로 돌아간다 */
  setQuery: (panel: PanelKind, query: string) => void;
  /** 그 패널에서 고른 항목을 위·아래로 옮긴다(아래는 양수). 처음과 끝에서 멈춘다 */
  moveSelection: (panel: PanelKind, delta: number, count: number) => void;
  /** 그 패널의 검색어를 지운다(패널이 닫힐 때) */
  clear: (panel: PanelKind) => void;
  /** 두 검색어를 모두 지운다(다시 시작) */
  clearAll: () => void;
};

const emptySearch = { query: '', selectedIndex: 0 } as const satisfies PanelSearch;

const initialPanels = {
  start: emptySearch,
  search: emptySearch,
} as const satisfies Record<PanelKind, PanelSearch>;

/**
 * 검색어와 결과에서 고른 항목을 담는 저장소. 검색어는 Start 위쪽 검색칸의 것과 검색 패널(작업 표시줄 검색칸)의 것 둘이다.
 * 작업 표시줄의 검색칸이 검색 패널의 검색어를 쓰고 Start 메뉴 층(검색 패널과 Start 안 결과 화면)이 읽어 결과를 그리므로,
 * 두 기능이 함께 쓰도록 `shared/stores/`에 둔다. 새로고침 뒤에 남지 않아 `persist`를 쓰지 않고, 다시 시작하면 지운다.
 * @codocs [[검색:입력칸]]
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[작업 공간:다시 시작]]
 */
export const useSearchStore = create<SearchStore>()(createSearchStore);

registerStoreReset(() => {
  useSearchStore.getState().clearAll();
});

/**
 * 저장소의 처음 상태와 동작을 만든다.
 * @param set 저장소 상태를 바꾸는 함수
 * @returns 처음 상태와 동작
 */
function createSearchStore(set: StoreApi<SearchStore>['setState']): SearchStore {
  return {
    panels: initialPanels,
    setQuery: (panel, query) => {
      set((state) => ({ panels: { ...state.panels, [panel]: { query, selectedIndex: 0 } } }));
    },
    moveSelection: (panel, delta, count) => {
      set(
        /**
         * 그 패널의 고른 차례만 옮긴 상태를 만든다.
         * @param state 지금 상태
         * @returns 바뀐 상태
         */
        (state) => {
          const current = state.panels[panel];
          const selectedIndex = moveSearchSelection(current.selectedIndex, delta, count);
          return { panels: { ...state.panels, [panel]: { ...current, selectedIndex } } };
        },
      );
    },
    clear: (panel) => {
      set((state) => ({ panels: { ...state.panels, [panel]: emptySearch } }));
    },
    clearAll: () => {
      set({ panels: initialPanels });
    },
  };
}
