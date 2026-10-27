// Chrome 창 내용(탭 목록과 탭마다의 뒤로·앞으로 기록)의 모양과, 창 규칙(`window-rules`)이 글을 열 때 쓰는 탭 규칙이다.
// 글을 여는 입구(바탕화면·탐색기·Start)가 창 저장소로 글을 열기 때문에 shared에 둔다. 나머지 탭 조작은 Chrome 기능에 있다.

/** Chrome 탭 하나가 보여 주는 페이지. 새 탭 페이지, 글, 검색 결과, 찾을 수 없음 화면이다 */
export type ChromeTabPage =
  | { kind: 'new-tab' }
  | { kind: 'post'; slug: string }
  | { kind: 'search'; query: string }
  | { kind: 'not-found'; url: string };

/** Chrome 탭 하나. 뒤로·앞으로 기록은 탭마다 따로 있다 */
export type ChromeTabState = {
  /** 탭 id. 창 안에서만 겹치지 않는다 */
  id: string;
  /** 지나온 페이지. 처음 연 페이지부터 차례대로다 */
  history: readonly ChromeTabPage[];
  /** 기록에서 지금 보는 페이지의 차례 */
  historyIndex: number;
};

/** Chrome 창 내용. 탭 목록과 고른 탭이다 */
export type ChromeWindowContent = {
  /** 앱 */
  app: 'chrome';
  /** 탭 목록 */
  tabs: readonly ChromeTabState[];
  /** 고른 탭의 차례 */
  activeTabIndex: number;
  /** 마지막으로 만든 탭의 차례. 새 탭 id를 만드는 데 쓴다 */
  lastTabSerial: number;
};

// 새 탭 페이지다.
const NEW_TAB_PAGE = { kind: 'new-tab' } as const;

/**
 * 페이지 하나를 보는 탭 하나의 Chrome 창 내용을 만든다.
 * @codocs [[Chrome:구성]]
 * @param page 볼 페이지. 주지 않으면 새 탭 페이지다
 * @returns Chrome 창 내용
 */
export function createChromeContent(page: ChromeTabPage = NEW_TAB_PAGE): ChromeWindowContent {
  return {
    app: 'chrome',
    tabs: [{ id: 'tab-1', history: [page], historyIndex: 0 }],
    activeTabIndex: 0,
    lastTabSerial: 1,
  };
}

/**
 * 고른 탭. 차례가 어긋났으면 첫 탭이다.
 * @param content Chrome 창 내용
 * @returns 고른 탭. 탭이 없으면 undefined
 */
export function getActiveChromeTab(content: ChromeWindowContent): ChromeTabState | undefined {
  return content.tabs[content.activeTabIndex] ?? content.tabs[0];
}

/**
 * 탭이 지금 보는 페이지. 기록이 어긋났으면 새 탭 페이지다.
 * @param tab 탭
 * @returns 페이지
 */
export function getChromeTabPage(tab: ChromeTabState): ChromeTabPage {
  return tab.history[tab.historyIndex] ?? NEW_TAB_PAGE;
}

/**
 * 창이 지금 보는 페이지(고른 탭의 페이지).
 * @param content Chrome 창 내용
 * @returns 페이지
 */
export function getActiveChromePage(content: ChromeWindowContent): ChromeTabPage {
  const tab = getActiveChromeTab(content);
  return tab === undefined ? NEW_TAB_PAGE : getChromeTabPage(tab);
}

/**
 * 새 탭을 열어 맨 끝에 두고 고른다. 새 탭(+) 버튼은 새 탭 페이지, 다른 곳에서 연 글은 그 글이다.
 * @codocs [[Chrome:구성]]
 * @codocs [[창 동작:열기 규칙]]
 * @param content Chrome 창 내용
 * @param page 새 탭이 볼 페이지. 주지 않으면 새 탭 페이지다
 * @returns 새 창 내용
 */
export function openChromeTab(
  content: ChromeWindowContent,
  page: ChromeTabPage = NEW_TAB_PAGE,
): ChromeWindowContent {
  const serial = content.lastTabSerial + 1;
  const tab: ChromeTabState = { id: `tab-${String(serial)}`, history: [page], historyIndex: 0 };
  const tabs = [...content.tabs, tab];
  return { ...content, tabs, activeTabIndex: tabs.length - 1, lastTabSerial: serial };
}

/**
 * 고른 탭에서 페이지로 간다(주소창, 링크, 검색 결과). 앞으로 기록은 지우고 새 페이지를 기록 끝에 더한다.
 * 지금 페이지와 같으면 기록을 늘리지 않는다.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @param page 갈 페이지
 * @returns 새 창 내용
 */
export function navigateChromeTab(
  content: ChromeWindowContent,
  page: ChromeTabPage,
): ChromeWindowContent {
  const tab = getActiveChromeTab(content);
  if (tab === undefined) {
    return createChromeContent(page);
  }
  if (isSameChromePage(getChromeTabPage(tab), page)) {
    return content;
  }
  const history = [...tab.history.slice(0, tab.historyIndex + 1), page];
  const next: ChromeTabState = { ...tab, history, historyIndex: history.length - 1 };
  const activeTabIndex = content.tabs.indexOf(tab);
  return {
    ...content,
    activeTabIndex,
    tabs: content.tabs.map((entry, index) => (index === activeTabIndex ? next : entry)),
  };
}

/**
 * 두 페이지가 같은지 본다.
 * @param left 페이지
 * @param right 페이지
 * @returns 같으면 true
 */
export function isSameChromePage(left: ChromeTabPage, right: ChromeTabPage): boolean {
  switch (left.kind) {
    case 'new-tab':
      return right.kind === 'new-tab';
    case 'post':
      return right.kind === 'post' && right.slug === left.slug;
    case 'search':
      return right.kind === 'search' && right.query === left.query;
    case 'not-found':
      return right.kind === 'not-found' && right.url === left.url;
  }
}
