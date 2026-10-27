import { getWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { initialRestartState } from '@/shared/utils/restart-rules/restart-rules';
import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/**
 * 동작 스토리를 그리기 전에 저장소를 모두 처음 상태로 돌린다. 스토리 meta의 `beforeEach`에 넘긴다.
 * 저장소는 모듈에 하나뿐이라 스토리를 옮겨 다니면 앞 스토리에서 연 창·패널이 남으므로 지운다.
 * 다시 시작 저장소(다시 시작 단계)는 초기화 등록표에 없으므로 따로 처음 상태로 둔다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 */
export function resetStoryStores(): void {
  resetRegisteredStores();
  useRestartStore.setState(initialRestartState);
}

/**
 * 동작 스토리가 미리 창을 열어 둔다. 지금 미리보기 화면의 작업 영역 크기로 연다.
 * @param apps 차례로 열 앱
 */
export function openStoryWindows(apps: readonly WindowApp[]): void {
  const workArea = getWorkArea(window.innerWidth, window.innerHeight);
  for (const app of apps) {
    useWindowStore.getState().open(app, workArea);
  }
}
