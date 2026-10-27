// Chrome 탭 조작(고르기, 닫기, 옮기기, 뒤로·앞으로) 규칙이다. 글을 열 때 쓰는 탭 규칙은 shared `chrome-tabs`에 있다.

import {
  type ChromeTabState,
  type ChromeWindowContent,
  getActiveChromeTab,
} from '@/shared/utils/chrome-tabs/chrome-tabs';

/**
 * 고른 탭에 뒤로 갈 기록이 있는지.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @returns 있으면 true
 */
export function canGoBack(content: ChromeWindowContent): boolean {
  const tab = getActiveChromeTab(content);
  return tab !== undefined && tab.historyIndex > 0;
}

/**
 * 고른 탭에 앞으로 갈 기록이 있는지.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @returns 있으면 true
 */
export function canGoForward(content: ChromeWindowContent): boolean {
  const tab = getActiveChromeTab(content);
  return tab !== undefined && tab.historyIndex < tab.history.length - 1;
}

/**
 * 고른 탭의 기록에서 한 칸 뒤로 간다.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @returns 새 창 내용. 뒤로 갈 기록이 없으면 그대로다
 */
export function goBack(content: ChromeWindowContent): ChromeWindowContent {
  return canGoBack(content) ? moveInHistory(content, -1) : content;
}

/**
 * 고른 탭의 기록에서 한 칸 앞으로 간다.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @returns 새 창 내용. 앞으로 갈 기록이 없으면 그대로다
 */
export function goForward(content: ChromeWindowContent): ChromeWindowContent {
  return canGoForward(content) ? moveInHistory(content, 1) : content;
}

/**
 * 탭을 고른다.
 * @codocs [[Chrome:구성]]
 * @param content Chrome 창 내용
 * @param index 고를 탭의 차례
 * @returns 새 창 내용. 없는 탭이거나 이미 고른 탭이면 그대로다
 */
export function selectTab(content: ChromeWindowContent, index: number): ChromeWindowContent {
  if (content.tabs[index] === undefined || index === content.activeTabIndex) {
    return content;
  }
  return { ...content, activeTabIndex: index };
}

/**
 * 탭을 끌어 다른 자리로 옮긴다. 고른 탭은 옮긴 뒤에도 같은 탭이다.
 * @codocs [[Chrome:구성]]
 * @codocs [[파일 탐색기:탭]]
 * @param content Chrome 창 내용
 * @param from 옮길 탭의 차례
 * @param to 옮길 자리
 * @returns 새 창 내용. 옮길 것이 없으면 그대로다
 */
export function moveTab(
  content: ChromeWindowContent,
  from: number,
  to: number,
): ChromeWindowContent {
  const tab = content.tabs[from];
  const target = Math.min(Math.max(to, 0), content.tabs.length - 1);
  if (tab === undefined || from === target) {
    return content;
  }
  const activeId = getActiveChromeTab(content)?.id;
  const rest = content.tabs.filter((_, index) => index !== from);
  const tabs = [...rest.slice(0, target), tab, ...rest.slice(target)];
  return { ...content, tabs, activeTabIndex: tabs.findIndex((entry) => entry.id === activeId) };
}

/**
 * 탭을 닫는다. 고른 탭을 닫으면 그 오른쪽 탭(없으면 왼쪽 탭)을 고른다. 마지막 탭을 닫으면 창을 닫아야 한다.
 * @codocs [[Chrome:구성]]
 * @codocs [[파일 탐색기:탭]]
 * @param content Chrome 창 내용
 * @param index 닫을 탭의 차례
 * @returns 새 창 내용. 마지막 탭이었으면 null(창을 닫는다)
 */
export function closeTab(content: ChromeWindowContent, index: number): ChromeWindowContent | null {
  if (content.tabs[index] === undefined) {
    return content;
  }
  if (content.tabs.length === 1) {
    return null;
  }
  const tabs = content.tabs.filter((_, tabIndex) => tabIndex !== index);
  let activeTabIndex = content.activeTabIndex;
  if (index < activeTabIndex) {
    activeTabIndex -= 1;
  } else if (index === activeTabIndex) {
    activeTabIndex = Math.min(index, tabs.length - 1);
  }
  return { ...content, tabs, activeTabIndex };
}

/**
 * 고른 탭의 기록 차례를 옮긴다.
 * @param content Chrome 창 내용
 * @param delta 옮길 칸 수
 * @returns 새 창 내용
 */
function moveInHistory(content: ChromeWindowContent, delta: number): ChromeWindowContent {
  const tab = getActiveChromeTab(content);
  if (tab === undefined) {
    return content;
  }
  const next: ChromeTabState = { ...tab, historyIndex: tab.historyIndex + delta };
  return { ...content, tabs: content.tabs.map((entry) => (entry === tab ? next : entry)) };
}
