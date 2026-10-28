import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import {
  getListMenuEntries,
  getPinnedMenuEntries,
  getPowerMenuEntries,
  getViewMenuEntries,
} from './start-menu-entries';

const pinnedOptions = {
  canMoveToFront: true,
  canCopyLink: true,
  onOpen: vi.fn(),
  onMoveToFront: vi.fn(),
  onCopyLink: vi.fn(),
  onUnpin: vi.fn(),
};

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

// @codocs [[Start 메뉴:고정됨]]
describe('Start 메뉴:고정됨', () => {
  it('고정 항목 메뉴는 열기·맨 앞으로 이동·링크 복사·시작 화면에서 고정 해제다', () => {
    expect(labels(getPinnedMenuEntries(pinnedOptions))).toEqual([
      '열기',
      '맨 앞으로 이동',
      '링크 복사',
      '-',
      '시작 화면에서 고정 해제',
    ]);
  });

  it('링크 복사는 글과 외부 링크에만 있다', () => {
    expect(labels(getPinnedMenuEntries({ ...pinnedOptions, canCopyLink: false }))).not.toContain(
      '링크 복사',
    );
  });

  it('맨 앞 항목에서는 맨 앞으로 이동을 고를 수 없다', () => {
    const [, moveToFront] = getPinnedMenuEntries({ ...pinnedOptions, canMoveToFront: false });
    expect(moveToFront).toMatchObject({ label: '맨 앞으로 이동', disabled: true });
  });
});

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

  it('앱만 작업 표시줄 고정 항목이 있고, 이미 고정된 앱은 작업 표시줄에서 고정 해제다', () => {
    expect(labels(getListMenuEntries({ ...listOptions, isPinnedToTaskbar: false }))).toEqual([
      '열기',
      '-',
      '시작 화면에 고정',
      '작업 표시줄에 고정',
    ]);
    expect(labels(getListMenuEntries({ ...listOptions, isPinnedToTaskbar: true })).at(-1)).toBe(
      '작업 표시줄에서 고정 해제',
    );
  });

  it('보기 메뉴는 범주·그리드·간단히 차례이고 지금 보기에 확인 표시를 한다', () => {
    expect(getViewMenuEntries('grid', vi.fn())).toEqual([
      expect.objectContaining({ kind: 'checkbox', label: '범주', checked: false }),
      expect.objectContaining({ kind: 'checkbox', label: '그리드', checked: true }),
      expect.objectContaining({ kind: 'checkbox', label: '간단히', checked: false }),
    ]);
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('전원 메뉴는 다시 시작 하나다', () => {
    expect(labels(getPowerMenuEntries(vi.fn()))).toEqual(['다시 시작']);
  });
});
