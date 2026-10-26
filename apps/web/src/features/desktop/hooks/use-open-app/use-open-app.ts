import type { WindowApp } from '@/core/window/window';
import { useWindowStore } from '@/core/window/window';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';

/**
 * 앱 창을 새로 여는 함수를 돌려준다. 창은 작업 영역 안에 놓이므로 지금 작업 영역 크기로 연다.
 * 수화가 끝나기 전에는 작업 영역 크기를 몰라 열지 않는다.
 * @codocs [[창 동작:창 조작]]
 * @returns 앱을 받아 새 창을 여는 함수
 */
export function useOpenApp(): (app: WindowApp) => void {
  const workArea = useWorkArea();
  const open = useWindowStore((state) => state.open);
  /**
   * 앱의 새 창을 연다.
   * @param app 열 앱
   */
  function openApp(app: WindowApp): void {
    if (workArea !== null) {
      open(app, workArea);
    }
  }
  return openApp;
}
