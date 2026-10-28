import { create, type StoreApi } from 'zustand';

import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';
import {
  closePanels,
  initialPanelState,
  openSearchPanel,
  type PanelState,
  toggleSearchPanel,
  toggleStartPanel,
} from '@/shared/utils/panel-rules/panel-rules';

/** Start·검색 패널 저장소. 상태와 바꾸는 동작이다 */
export type PanelStore = PanelState & {
  /** Start 버튼을 눌렀다 */
  toggleStart: () => void;
  /** 작업 표시줄 검색칸에 포커스했다 */
  openSearch: () => void;
  /** 좁은 화면의 검색 버튼을 눌렀다 */
  toggleSearch: () => void;
  /** 패널을 닫는다(Esc, 바깥 클릭, 항목 열기) */
  close: () => void;
  /** 전원 메뉴를 열거나 닫는다. Base UI 메뉴가 부른다 */
  setPowerMenuOpen: (isOpen: boolean) => void;
  /** 처음 상태로 돌린다(다시 시작) */
  reset: () => void;
};

/**
 * Start 메뉴와 검색 패널의 열림 상태를 담는 저장소. 규칙은 `panel-rules.ts`의 순수 함수가 갖는다.
 * 작업 표시줄(Start 버튼, 검색칸·검색 버튼)이 열고 패널 층(Start 메뉴)이 그리고 닫으므로, 두 기능이 함께 쓰도록 `shared/stores/`에 둔다.
 * 패널을 닫으면 그 안의 전원 메뉴도 닫히는 규칙이 패널 전환과 묶여 있어 전원 메뉴 열림도 여기 둔다.
 * 열린 패널이 닫히거나 다른 패널로 바뀌면 닫힌 패널의 검색어도 지운다(`[[검색:입력칸]]`).
 * 열림 상태는 새로고침 뒤에 남지 않으므로 `persist`를 쓰지 않는다. 다시 시작하면 닫히도록 초기화 함수를 등록한다.
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[작업 공간:다시 시작]]
 */
export const usePanelStore = create<PanelStore>()(createPanelStore);

registerStoreReset(() => {
  usePanelStore.getState().reset();
});

/**
 * 저장소의 처음 상태와 동작을 만든다.
 * @param set 저장소 상태를 바꾸는 함수
 * @returns 처음 상태와 동작
 */
function createPanelStore(set: StoreApi<PanelStore>['setState']): PanelStore {
  /**
   * 패널 규칙을 반영한다. 열린 패널이 닫히거나 다른 패널로 바뀌면 닫힌 패널의 검색어를 지운다.
   * @codocs [[검색:입력칸]]
   * @param rule 지금 상태를 받아 바뀐 상태를 돌려주는 규칙
   */
  function change(rule: (state: PanelState) => PanelState): void {
    set(
      /**
       * 규칙으로 바뀐 상태를 만든다.
       * @param state 지금 상태
       * @returns 바뀐 상태
       */
      (state) => {
        const next = rule(state);
        if (state.openPanel !== null && next.openPanel !== state.openPanel) {
          useSearchStore.getState().clear(state.openPanel);
        }
        return next;
      },
    );
  }

  return {
    ...initialPanelState,
    toggleStart: () => {
      change(toggleStartPanel);
    },
    openSearch: () => {
      change(openSearchPanel);
    },
    toggleSearch: () => {
      change(toggleSearchPanel);
    },
    close: () => {
      change(closePanels);
    },
    setPowerMenuOpen: (isOpen) => {
      set({ isPowerMenuOpen: isOpen });
    },
    reset: () => {
      set(initialPanelState);
    },
  };
}
