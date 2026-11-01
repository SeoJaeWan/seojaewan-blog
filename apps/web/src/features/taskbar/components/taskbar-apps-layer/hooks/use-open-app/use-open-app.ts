import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/**
 * 앱 창을 새로 여는 함수를 돌려준다. 창은 작업 영역 안에 놓이므로 지금 작업 영역 크기로 연다.
 * 수화가 끝나기 전에는 작업 영역 크기를 몰라 열지 않는다. 바탕화면 아이콘, Start 항목, 작업 표시줄 앱 버튼이 이 함수로 창을 연다.
 * 창 안에 무엇을 그릴지는 창 층에 앱 등록표를 넘기는 쪽(shell)이 정한다.
 * @codocs [[창 동작:창 조작]]
 * @returns 앱을 받아 새 창을 여는 함수
 */
export function useOpenApp(): (app: WindowApp) => void {
  const open = useWindowStore((state) => state.open);
  const workArea = useWorkArea();
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
