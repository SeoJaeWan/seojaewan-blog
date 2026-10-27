import { describe, expect, it } from 'vitest';

import {
  type ChromeTabPage,
  createChromeContent,
  getActiveChromePage,
  navigateChromeTab,
  openChromeTab,
} from '@/shared/utils/chrome-tabs/chrome-tabs';

import {
  canGoBack,
  canGoForward,
  closeTab,
  goBack,
  goForward,
  moveTab,
  selectTab,
} from './chrome-navigation';

const postA: ChromeTabPage = { kind: 'post', slug: 'a' };
const postB: ChromeTabPage = { kind: 'post', slug: 'b' };

/**
 * 새 탭 페이지 하나와 글 탭 둘(a, b)이 있는 창 내용을 만든다. 고른 탭은 마지막 탭이다.
 * @returns Chrome 창 내용
 */
function threeTabs(): ReturnType<typeof createChromeContent> {
  return openChromeTab(openChromeTab(createChromeContent(), postA), postB);
}

// @codocs [[Chrome:구성]]
describe('Chrome:구성', () => {
  it('새 탭은 맨 끝에 새 탭 페이지로 열고 고른다', () => {
    const content = openChromeTab(createChromeContent());
    expect(content.tabs.map((tab) => tab.id)).toEqual(['tab-1', 'tab-2']);
    expect(content.activeTabIndex).toBe(1);
    expect(getActiveChromePage(content)).toEqual({ kind: 'new-tab' });
  });

  it('탭을 누르면 그 탭을 고른다', () => {
    expect(selectTab(threeTabs(), 0).activeTabIndex).toBe(0);
  });

  it('고른 탭을 닫으면 오른쪽 탭, 없으면 왼쪽 탭을 고른다', () => {
    const middle = selectTab(threeTabs(), 1);
    expect(closeTab(middle, 1)?.activeTabIndex).toBe(1);
    expect(getActiveChromePage(closeTab(middle, 1) ?? middle)).toEqual(postB);
    expect(closeTab(threeTabs(), 2)?.activeTabIndex).toBe(1);
  });

  it('고른 탭보다 앞의 탭을 닫아도 고른 탭은 그대로다', () => {
    const content = closeTab(threeTabs(), 0);
    expect(content === null ? null : getActiveChromePage(content)).toEqual(postB);
  });

  it('마지막 탭을 닫으면 창을 닫는다(null)', () => {
    expect(closeTab(createChromeContent(), 0)).toBeNull();
  });

  it('탭을 끌어 옮겨도 고른 탭은 같은 탭이다', () => {
    const moved = moveTab(threeTabs(), 2, 0);
    expect(moved.tabs.map((tab) => tab.id)).toEqual(['tab-3', 'tab-1', 'tab-2']);
    expect(moved.activeTabIndex).toBe(0);
  });

  it('뒤로·앞으로 기록은 탭마다 따로 있다', () => {
    const navigated = navigateChromeTab(threeTabs(), postA);
    expect(canGoBack(navigated)).toBe(true);
    expect(canGoBack(selectTab(navigated, 1))).toBe(false);
  });

  it('주소로 이동하면 기록이 쌓이고 뒤로·앞으로로 오간다', () => {
    const navigated = navigateChromeTab(createChromeContent(), postA);
    expect(canGoForward(navigated)).toBe(false);
    const back = goBack(navigated);
    expect(getActiveChromePage(back)).toEqual({ kind: 'new-tab' });
    expect(canGoForward(back)).toBe(true);
    expect(getActiveChromePage(goForward(back))).toEqual(postA);
  });

  it('뒤로 간 뒤 다른 페이지로 가면 앞으로 기록을 지운다', () => {
    const back = goBack(navigateChromeTab(createChromeContent(), postA));
    const next = navigateChromeTab(back, postB);
    expect(next.tabs[0]?.history).toEqual([{ kind: 'new-tab' }, postB]);
    expect(canGoForward(next)).toBe(false);
  });

  it('지금 페이지와 같은 곳으로 가면 기록을 늘리지 않는다', () => {
    const content = navigateChromeTab(createChromeContent(), postA);
    expect(navigateChromeTab(content, postA)).toBe(content);
  });

  it('기록이 없으면 뒤로·앞으로는 그대로다', () => {
    const content = createChromeContent();
    expect(goBack(content)).toBe(content);
    expect(goForward(content)).toBe(content);
  });
});
