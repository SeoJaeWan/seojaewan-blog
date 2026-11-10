import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getListMenuEntries } from './list-menu-entries';

const listOptions = {
  isPinnedToStart: false,
  canCopyLink: false,
  isPinnedToTaskbar: undefined,
  onOpen: vi.fn(),
  onToggleStartPin: vi.fn(),
  onCopyLink: vi.fn(),
  onToggleTaskbarPin: vi.fn(),
};

/**
 * 메뉴 항목의 이름들(구분선은 `-`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => ('label' in entry ? entry.label : '-'));
}

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  it('글 메뉴는 열기·시작 화면에 고정·링크 복사다', () => {
    expect(labels(getListMenuEntries({ ...listOptions, canCopyLink: true }))).toEqual([
      '열기',
      '-',
      '시작 화면에 고정',
      '링크 복사',
    ]);
  });

  it('이미 고정된 항목은 시작 화면에서 고정 해제를 보인다', () => {
    expect(labels(getListMenuEntries({ ...listOptions, isPinnedToStart: true }))).toContain(
      '시작 화면에서 고정 해제',
    );
  });

  it('앱만 작업 표시줄 고정 항목이 있고, 이미 고정된 앱은 작업 표시줄에서 제거다', () => {
    expect(labels(getListMenuEntries({ ...listOptions, isPinnedToTaskbar: false }))).toEqual([
      '열기',
      '-',
      '시작 화면에 고정',
      '작업 표시줄에 고정',
    ]);
    expect(labels(getListMenuEntries({ ...listOptions, isPinnedToTaskbar: true })).at(-1)).toBe(
      '작업 표시줄에서 제거',
    );
  });
});
