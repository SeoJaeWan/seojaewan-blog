import { useStartMenuStore } from '@/features/start-menu/start-menu';
import { useWindowStore } from '@/features/window/window';

/** 브라우저에 저장하는 저장소(Zustand `persist`)가 다시 시작할 때 지울 수 있게 드러내는 부분 */
type PersistedStore = {
  persist: {
    /** 브라우저에 저장된 값을 지운다 */
    clearStorage: () => void;
  };
};

// 다시 시작할 때 저장분을 지울 `persist` 저장소 목록이다. 아직 브라우저에 저장하는 저장소가 없어 비어 있다.
// 폴더·배치·휴지통, 고정 목록, 보기 같은 설정을 저장하는 저장소를 만들면 여기에 더한다.
const persistedStores: readonly PersistedStore[] = [];

/**
 * 작업 공간의 저장소를 모두 처음 상태로 돌린다. 열린 창을 모두 닫고 Start·검색 패널을 닫으며, 브라우저에 저장한 값을 지운다.
 * 저장소 밖의 상태(컴포넌트 지역 상태)는 쓰는 곳이 데스크톱 하위 트리를 다시 마운트해 지운다.
 * @codocs [[작업 공간:다시 시작]]
 */
export function resetWorkspaceStores(): void {
  useWindowStore.getState().reset();
  useStartMenuStore.getState().reset();
  for (const store of persistedStores) {
    store.persist.clearStorage();
  }
}
