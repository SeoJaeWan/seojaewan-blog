import { create, type StoreApi } from 'zustand';

import {
  finishRestartCovering,
  finishRestartRevealing,
  finishRestartShowing,
  initialRestartState,
  type RestartState,
  startRestart,
} from '@/core/workspace/rules/restart-rules/restart-rules';
import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';

/** 작업 공간 저장소. 다시 시작 단계와 데스크톱 하위 트리의 세대 번호다 */
export type WorkspaceStore = RestartState & {
  /** 전원 메뉴의 `다시 시작`을 눌렀다. 다시 시작하는 중이면 무시한다 */
  restart: () => void;
  /** 재부팅 화면이 화면을 다 덮었다. 저장소를 처음 상태로 돌리고 세대를 올린다 */
  finishCovering: () => void;
  /** 재부팅 화면을 보여 주는 시간이 지났다 */
  finishShowing: () => void;
  /** 재부팅 화면이 사라졌다 */
  finishRevealing: () => void;
};

/**
 * 다시 시작의 진행을 담는 저장소. 다시 마운트하는 데스크톱 하위 트리 바깥(shell 최상위와 재부팅 화면)이 읽어,
 * 다시 마운트한 뒤에도 남는다. 다시 시작으로 지우는 대상이 아니고 브라우저에 저장하지도 않는다.
 * 단계 규칙은 `restart-rules.ts`의 순수 함수가 갖는다.
 * @codocs [[작업 공간:다시 시작]]
 * @codocs [[기술 스택:상태 관리]]
 */
export const useWorkspaceStore = create<WorkspaceStore>()(createWorkspaceStore);

/**
 * 저장소의 처음 상태와 동작을 만든다. 단계는 정해진 차례로만 넘어가고, 차례가 아닌 알림은 무시한다.
 * @param set 저장소 상태를 바꾸는 함수
 * @param get 지금 상태를 읽는 함수
 * @returns 처음 상태와 동작
 */
function createWorkspaceStore(
  set: StoreApi<WorkspaceStore>['setState'],
  get: StoreApi<WorkspaceStore>['getState'],
): WorkspaceStore {
  return {
    ...initialRestartState,
    restart: () => {
      set(startRestart);
    },
    finishCovering: () => {
      if (get().phase !== 'covering') {
        return;
      }
      // 덮은 뒤에 지워야 창이 닫히고 아이콘이 돌아가는 모습이 가려진다.
      // 열린 창, Start·검색 패널처럼 작업 공간의 저장소는 만들 때 초기화 함수를 등록해 두었다.
      // 저장소 밖의 상태(컴포넌트 지역 상태)는 세대가 올라 데스크톱 하위 트리를 다시 마운트하며 지워진다.
      resetRegisteredStores();
      set(finishRestartCovering);
    },
    finishShowing: () => {
      set(finishRestartShowing);
    },
    finishRevealing: () => {
      set(finishRestartRevealing);
    },
  };
}
