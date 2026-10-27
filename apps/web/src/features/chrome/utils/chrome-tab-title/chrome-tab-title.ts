import {
  type ChromeTabPage,
  type ChromeWindowContent,
  getActiveChromePage,
} from '@/shared/utils/chrome-tabs/chrome-tabs';
import { getPostItemId, type WorkspaceState } from '@/shared/utils/workspace-rules/workspace-rules';

// 새 탭 페이지의 탭 제목이다.
const NEW_TAB_TITLE = '새 탭';

/** 찾을 수 없음 화면의 탭 제목이다 */
export const NOT_FOUND_TITLE = '페이지를 찾을 수 없음';

// 검색 결과 탭 제목에서 검색어 뒤에 붙는 글자다.
const SEARCH_TITLE_SUFFIX = ' - 검색';

// 창 제목 뒤에 붙는 앱 이름이다.
const CHROME_TITLE_SUFFIX = ' - Chrome';

/**
 * Chrome 탭 제목. 새 탭 페이지는 "새 탭", 글은 글 제목, 검색 결과는 "<검색어> - 검색", 찾을 수 없음 화면은
 * "페이지를 찾을 수 없음"이다. 글 색인에 없는 글은 찾을 수 없음 화면을 보이므로 그 제목이다.
 * @codocs [[Chrome:구성]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @param workspace 작업 공간
 * @param page 탭 페이지
 * @returns 탭 제목
 */
export function getChromeTabTitle(
  workspace: Pick<WorkspaceState, 'items'>,
  page: ChromeTabPage,
): string {
  switch (page.kind) {
    case 'new-tab':
      return NEW_TAB_TITLE;
    case 'post':
      return workspace.items[getPostItemId(page.slug)]?.name ?? NOT_FOUND_TITLE;
    case 'search':
      return `${page.query}${SEARCH_TITLE_SUFFIX}`;
    case 'not-found':
      return NOT_FOUND_TITLE;
  }
}

/**
 * Chrome 창 제목(창 영역의 접근성 이름, 작업 표시줄 창 미리보기 제목). 고른 탭의 제목 뒤에 앱 이름을 붙인다.
 * @codocs [[Chrome:구성]]
 * @param workspace 작업 공간
 * @param content Chrome 창 내용
 * @returns 창 제목
 */
export function getChromeWindowTitle(
  workspace: Pick<WorkspaceState, 'items'>,
  content: ChromeWindowContent,
): string {
  return `${getChromeTabTitle(workspace, getActiveChromePage(content))}${CHROME_TITLE_SUFFIX}`;
}
