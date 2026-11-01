import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getPinnedMenuEntries } from './pinned-menu-entries';

const pinnedOptions = {
  canMoveToFront: true,
  canCopyLink: true,
  onOpen: vi.fn(),
  onMoveToFront: vi.fn(),
  onCopyLink: vi.fn(),
  onUnpin: vi.fn(),
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
