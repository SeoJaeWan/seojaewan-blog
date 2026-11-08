import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getPinnedMenuEntries, getPinnedMoves } from './pinned-menu-entries';

const pinnedOptions = {
  moves: { canMoveToFront: true, canMoveLeft: true, canMoveRight: true },
  canCopyLink: true,
  onOpen: vi.fn(),
  onMoveToFront: vi.fn(),
  onMoveLeft: vi.fn(),
  onMoveRight: vi.fn(),
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
  it('고정 항목 메뉴는 열기·앞으로 이동·왼쪽으로 이동·오른쪽으로 이동·링크 복사·시작 화면에서 고정 해제다', () => {
    expect(labels(getPinnedMenuEntries(pinnedOptions))).toEqual([
      '열기',
      '앞으로 이동',
      '왼쪽으로 이동',
      '오른쪽으로 이동',
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

  it('고를 수 없는 이동 메뉴는 흐리게 하지 않고 숨긴다', () => {
    const entries = getPinnedMenuEntries({
      ...pinnedOptions,
      moves: { canMoveToFront: false, canMoveLeft: false, canMoveRight: true },
    });
    expect(labels(entries)).toEqual([
      '열기',
      '오른쪽으로 이동',
      '링크 복사',
      '-',
      '시작 화면에서 고정 해제',
    ]);
  });

  it('동작을 받지 않은 이동 메뉴는 보이지 않는다', () => {
    expect(labels(getPinnedMenuEntries({ ...pinnedOptions, onMoveLeft: undefined }))).not.toContain(
      '왼쪽으로 이동',
    );
  });

  it.each([
    {
      position: '첫 칸',
      index: 0,
      count: 5,
      canMoveToFront: false,
      canMoveLeft: false,
      canMoveRight: true,
    },
    {
      position: '둘째 칸',
      index: 1,
      count: 5,
      canMoveToFront: false,
      canMoveLeft: true,
      canMoveRight: true,
    },
    {
      position: '마지막 칸',
      index: 4,
      count: 5,
      canMoveToFront: true,
      canMoveLeft: true,
      canMoveRight: false,
    },
    {
      position: '둘째 칸이 마지막',
      index: 1,
      count: 2,
      canMoveToFront: false,
      canMoveLeft: true,
      canMoveRight: false,
    },
    {
      position: '그 밖의 칸',
      index: 2,
      count: 5,
      canMoveToFront: true,
      canMoveLeft: true,
      canMoveRight: true,
    },
    {
      position: '칸 하나',
      index: 0,
      count: 1,
      canMoveToFront: false,
      canMoveLeft: false,
      canMoveRight: false,
    },
  ])(
    '$position의 이동 메뉴는 칸의 위치로 정한다',
    ({ index, count, canMoveToFront, canMoveLeft, canMoveRight }) => {
      expect(getPinnedMoves(index, count)).toEqual({ canMoveToFront, canMoveLeft, canMoveRight });
    },
  );
});
