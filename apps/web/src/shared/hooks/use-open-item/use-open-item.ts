import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { createExplorerContent } from '@/shared/utils/window-rules/window-rules';
import { getItemOpenAction } from '@/shared/utils/workspace-rules/workspace-rules';

/** 항목을 여는 방법 */
export type OpenItemOptions = {
  /** 새 창에서 열기. 글을 가장 최근 Chrome 창의 새 탭이 아니라 새 Chrome 창으로 연다 */
  isNewWindow?: boolean;
};

/**
 * 작업 공간 항목을 여는 함수를 돌려준다. 바탕화면·Start·검색·탐색기가 항목을 열 때 이 함수 하나를 쓴다.
 * - 폴더: 그 폴더를 보는 새 탐색기 창
 * - 휴지통: 휴지통을 보는 새 탐색기 창
 * - 글: 가장 최근에 쓴 Chrome 창의 새 탭(없으면 새 Chrome 창)
 * - 외부 링크: 실제 브라우저의 새 탭(블로그 안의 창을 만들지 않는다)
 * - 앱(`APP_ITEM_IDS`): 그 앱의 새 창
 * `isNewWindow`(우클릭 메뉴의 새 창에서 열기)면 글도 열린 Chrome 창과 상관없이 새 Chrome 창으로 연다. 폴더는 늘 새 탐색기 창이다.
 * 휴지통 안의 항목은 열지 않는다. 연 항목은 최근 항목에 넣는다(앱·휴지통은 빼는 규칙은 `recordRecentItem`이 갖는다).
 * 창은 작업 영역 안에 놓이므로 수화가 끝나 작업 영역 크기를 알기 전에는 열지 않는다.
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[항목 모델:종류]]
 * @codocs [[검색:입력 전 화면]]
 * @returns 항목 id를 받아 그 항목을 여는 함수
 */
export function useOpenItem(): (id: string, options?: OpenItemOptions) => void {
  const workArea = useWorkArea();
  const openWindow = useWindowStore((state) => state.open);
  const openPost = useWindowStore((state) => state.openPost);
  const recordRecentItem = useWorkspaceStore((state) => state.recordRecentItem);

  /**
   * 항목을 연다.
   * @param id 항목 id
   * @param options 여는 방법
   */
  function openItem(id: string, options: OpenItemOptions = {}): void {
    if (workArea === null) {
      return;
    }
    const action = getItemOpenAction(useWorkspaceStore.getState(), id);
    switch (action.type) {
      case 'none':
        return;
      case 'explorer':
        openWindow('file-explorer', workArea, createExplorerContent(action.folderId));
        break;
      case 'post':
        if (options.isNewWindow === true) {
          openWindow('chrome', workArea, {
            app: 'chrome',
            tabs: [{ kind: 'post', slug: action.slug }],
            activeTabIndex: 0,
          });
        } else {
          openPost(action.slug, workArea);
        }
        break;
      case 'external':
        window.open(action.url, '_blank', 'noopener');
        break;
      case 'app':
        openWindow(action.app, workArea);
        break;
    }
    recordRecentItem(id);
  }

  return openItem;
}
