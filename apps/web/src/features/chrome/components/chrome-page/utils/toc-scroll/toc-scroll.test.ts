import { describe, expect, it } from 'vitest';

import { getTocScrollTop } from './toc-scroll';

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면 - 목차 자동 스크롤', () => {
  const list = { top: 100, bottom: 300, scrollTop: 50 };

  it('지금 읽는 위치 항목이 보이면 그대로 둔다', () => {
    expect(getTocScrollTop(list, { top: 120, bottom: 150 })).toBe(50);
  });

  it('아래로 가려졌으면 항목 아래쪽을 목록 아래쪽에 맞춘다', () => {
    expect(getTocScrollTop(list, { top: 290, bottom: 330 })).toBe(80);
  });

  it('위로 가려졌으면 항목 위쪽을 목록 위쪽에 맞춘다', () => {
    expect(getTocScrollTop(list, { top: 70, bottom: 100 })).toBe(20);
  });
});
