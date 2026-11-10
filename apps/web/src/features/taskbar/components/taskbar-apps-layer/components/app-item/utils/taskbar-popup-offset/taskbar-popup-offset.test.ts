import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getTaskbarPopupOffset, getTaskbarPreviewMargin } from './taskbar-popup-offset';

const TOKENS = {
  '--spacing-md': '12px',
  '--size-taskbar-height': '48px',
  '--size-taskbar-item': '40px',
  '--spacing-xs': '4px',
} as const;

// @codocs [[작업 표시줄:우클릭 메뉴]]
// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄 팝업 간격', () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries(TOKENS)) {
      document.documentElement.style.setProperty(name, value);
    }
  });

  afterEach(() => {
    for (const name of Object.keys(TOKENS)) {
      document.documentElement.style.removeProperty(name);
    }
  });

  it('작업 표시줄 위 끝에서는 spacing/md만큼 띄운다', () => {
    expect(getTaskbarPopupOffset('taskbar')).toBe(12);
  });

  it('버튼 위 끝에서는 작업 표시줄 안 버튼 위 여백을 더해 띄운다', () => {
    expect(getTaskbarPopupOffset('button')).toBe(16);
  });

  it('창 미리보기 목록은 Popover의 spacing/xs를 뺀 나머지만 여백으로 더한다', () => {
    expect(getTaskbarPreviewMargin('button')).toBe(12);
    expect(getTaskbarPreviewMargin('taskbar')).toBe(8);
  });
});
