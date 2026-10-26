import { create, type StoreApi } from 'zustand';

import {
  closePanels,
  initialStartMenuState,
  openSearchPanel,
  type StartMenuState,
  toggleSearchPanel,
  toggleStartPanel,
} from '@/features/start-menu/rules/start-menu-rules/start-menu-rules';
import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';

/** Start·검색 패널 저장소. 상태와 바꾸는 동작이다 */
export type StartMenuStore = StartMenuState & {
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
 * Start 메뉴와 검색 패널의 열림 상태를 담는 저장소. 규칙은 `start-menu-rules.ts`의 순수 함수가 갖는다.
 * 열림 상태는 새로고침 뒤에 남지 않으므로 `persist`를 쓰지 않는다. 다시 시작하면 닫히도록 초기화 함수를 등록한다.
 * @codocs [[기술 스택:상태 관리]]
 * @codocs [[작업 공간:다시 시작]]
 */
export const useStartMenuStore = create<StartMenuStore>()(createStartMenuStore);

registerStoreReset(() => {
  useStartMenuStore.getState().reset();
});

/**
 * 저장소의 처음 상태와 동작을 만든다.
 * @param set 저장소 상태를 바꾸는 함수
 * @returns 처음 상태와 동작
 */
function createStartMenuStore(set: StoreApi<StartMenuStore>['setState']): StartMenuStore {
  return {
    ...initialStartMenuState,
    toggleStart: () => {
      set(toggleStartPanel);
    },
    openSearch: () => {
      set(openSearchPanel);
    },
    toggleSearch: () => {
      set(toggleSearchPanel);
    },
    close: () => {
      set(closePanels());
    },
    setPowerMenuOpen: (isOpen) => {
      set({ isPowerMenuOpen: isOpen });
    },
    reset: () => {
      set(initialStartMenuState);
    },
  };
}
