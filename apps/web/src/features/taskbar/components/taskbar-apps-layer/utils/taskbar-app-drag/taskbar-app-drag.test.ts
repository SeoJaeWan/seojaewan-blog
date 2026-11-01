import { describe, expect, it } from 'vitest';

import { findTaskbarAppAt, TASKBAR_APP_ATTRIBUTE } from './taskbar-app-drag';

const APPS = ['file-explorer', 'chrome'] as const;

/**
 * 앱 버튼 두 개를 40px 칸으로 놓은 요소를 만든다. jsdom은 레이아웃이 없어 버튼 자리를 직접 정한다.
 * @returns 앱 버튼들을 담은 요소
 */
function createButtons(): HTMLElement {
  const container = document.createElement('div');
  for (const [index, app] of APPS.entries()) {
    const button = document.createElement('button');
    button.setAttribute(TASKBAR_APP_ATTRIBUTE, app);
    button.getBoundingClientRect = () => new DOMRect(index * 40, 0, 40, 40);
    container.append(button);
  }
  return container;
}

// @codocs [[작업 표시줄:고정과 순서]]
describe('작업 표시줄:고정과 순서 - 끌어서 순서 바꾸기', () => {
  it('끄는 포인터가 앱 버튼 위에 있으면 그 버튼의 앱을 찾는다', () => {
    expect(findTaskbarAppAt(createButtons(), APPS, 50, 20)).toBe('chrome');
  });

  it('끄는 포인터가 앱 버튼 위가 아니면 null이다', () => {
    expect(findTaskbarAppAt(createButtons(), APPS, 50, 100)).toBeNull();
  });
});
