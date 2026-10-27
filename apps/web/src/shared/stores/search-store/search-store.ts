import { create, type StoreApi } from 'zustand';

import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';
import { moveSearchSelection } from '@/shared/utils/search-rules/search-rules';

/** 검색 저장소. 검색어와 결과에서 고른 차례, 바꾸는 동작이다 */
export type SearchStore = {
  /** 검색어. 작업 표시줄 검색칸, Start 위쪽 검색칸, 모바일 검색 패널의 입력칸이 함께 쓴다 */
  query: string;
  /** 결과 화면에서 고른 항목의 차례(보이는 차례). 검색어가 바뀌면 최고 일치(0)로 돌아간다 */
  selectedIndex: number;
  /** 검색어를 바꾼다. 고른 항목은 최고 일치로 돌아간다 */
  setQuery: (query: string) => void;
  /** 고른 항목을 위·아래로 옮긴다(아래는 양수). 처음과 끝에서 멈춘다 */
  moveSelection: (delta: number, count: number) => void;
  /** 검색어를 지운다(패널을 닫거나 항목을 열 때) */
  clear: () => void;
};

const INITIAL_SEARCH_STATE = { query: '', selectedIndex: 0 } as const;

/**
 * 검색어와 결과에서 고른 항목을 담는 저장소. 작업 표시줄의 검색칸이 검색어를 쓰고 Start 메뉴 층(검색 패널과 Start 안 결과 화면)이
 * 읽어 결과를 그리므로, 두 기능이 함께 쓰도록 `shared/stores/`에 둔다. 새로고침 뒤에 남지 않아 `persist`를 쓰지 않고,
 * 다시 시작하면 지운다.
 * @codocs [[검색:개요]]
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[작업 공간:다시 시작]]
 */
export const useSearchStore = create<SearchStore>()(createSearchStore);

registerStoreReset(() => {
  useSearchStore.getState().clear();
});

/**
 * 저장소의 처음 상태와 동작을 만든다.
 * @param set 저장소 상태를 바꾸는 함수
 * @returns 처음 상태와 동작
 */
function createSearchStore(set: StoreApi<SearchStore>['setState']): SearchStore {
  return {
    ...INITIAL_SEARCH_STATE,
    setQuery: (query) => {
      set({ query, selectedIndex: 0 });
    },
    moveSelection: (delta, count) => {
      set((state) => ({ selectedIndex: moveSearchSelection(state.selectedIndex, delta, count) }));
    },
    clear: () => {
      set(INITIAL_SEARCH_STATE);
    },
  };
}
