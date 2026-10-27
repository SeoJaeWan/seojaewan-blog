import type { ChromeTabPage, WindowContent } from '@/shared/utils/window-rules/window-rules';
import { getPostItemId, type WorkspaceState } from '@/shared/utils/workspace-rules/workspace-rules';

/** Chrome 창 내용 */
export type ChromeWindowContent = Extract<WindowContent, { app: 'chrome' }>;

// 새 탭 페이지의 탭 제목이다.
const NEW_TAB_TITLE = '새 탭';

// 창 제목 뒤에 붙는 앱 이름이다.
const CHROME_TITLE_SUFFIX = ' - Chrome';

/**
 * Chrome 탭 제목. 새 탭 페이지는 "새 탭", 글은 글 제목이다. 글 색인에 없는 글은 slug를 쓴다.
 * @codocs [[Chrome:새 탭 페이지]]
 * @param workspace 작업 공간
 * @param page 탭 페이지
 * @returns 탭 제목
 */
export function getChromeTabTitle(
  workspace: Pick<WorkspaceState, 'items'>,
  page: ChromeTabPage,
): string {
  if (page.kind === 'new-tab') {
    return NEW_TAB_TITLE;
  }
  return workspace.items[getPostItemId(page.slug)]?.name ?? page.slug;
}

/**
 * Chrome 창 제목(창 영역의 접근성 이름, 작업 표시줄 창 미리보기 제목). 고른 탭의 제목 뒤에 앱 이름을 붙인다.
 * @param workspace 작업 공간
 * @param content Chrome 창 내용
 * @returns 창 제목
 */
export function getChromeWindowTitle(
  workspace: Pick<WorkspaceState, 'items'>,
  content: ChromeWindowContent,
): string {
  const page = content.tabs[content.activeTabIndex];
  const title = page === undefined ? NEW_TAB_TITLE : getChromeTabTitle(workspace, page);
  return `${title}${CHROME_TITLE_SUFFIX}`;
}
