import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import { getEmptyMenuEntries } from './empty-menu-entries';

const viewOptions = {
  view: DEFAULT_EXPLORER_VIEW,
  onViewChange: vi.fn(),
  onSortByChange: vi.fn(),
  onSortDirectionChange: vi.fn(),
};

const emptyOptions = {
  ...viewOptions,
  isRecycleBin: false,
  canPaste: true,
  onPaste: vi.fn(),
  onNewFolder: vi.fn(),
  isRecycleBinEmpty: false,
  onRefresh: vi.fn(),
  onEmptyRecycleBin: vi.fn(),
};

/**
 * 메뉴 항목의 이름들(구분선은 `-`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => ('label' in entry ? entry.label : '-'));
}

// @codocs [[파일 탐색기:우클릭 메뉴]]
describe('파일 탐색기:우클릭 메뉴', () => {
  it('빈 곳 메뉴는 보기·정렬 기준·붙여넣기·새로 만들기다', () => {
    const entries = getEmptyMenuEntries(emptyOptions);
    expect(labels(entries)).toEqual(['보기', '정렬 기준', '-', '붙여넣기', '새로 만들기']);
  });

  it('붙여넣을 수 없으면 붙여넣기를 고를 수 없다', () => {
    const entries = getEmptyMenuEntries({ ...emptyOptions, canPaste: false });
    expect(entries.find((entry) => 'label' in entry && entry.label === '붙여넣기')).toMatchObject({
      isDisabled: true,
    });
  });

  it('휴지통 빈 곳 메뉴는 정렬 기준·새로 고침·휴지통 비우기다', () => {
    const entries = getEmptyMenuEntries({ ...emptyOptions, isRecycleBin: true });
    expect(labels(entries)).toEqual(['정렬 기준', '새로 고침', '-', '휴지통 비우기']);
  });

  it('휴지통 빈 곳 메뉴의 정렬 기준은 이름·원래 위치·삭제한 날짜다', () => {
    const [sort] = getEmptyMenuEntries({ ...emptyOptions, isRecycleBin: true });
    const [sortBy] = sort?.kind === 'submenu' ? (sort.entries ?? []) : [];
    expect(sortBy?.kind === 'radio-group' ? sortBy.options.map((item) => item.label) : []).toEqual([
      '이름',
      '원래 위치',
      '삭제한 날짜',
    ]);
  });

  it('휴지통 빈 곳 메뉴의 새로 고침과 휴지통 비우기는 각 동작을 부른다', () => {
    const handleRefresh = vi.fn();
    const handleEmpty = vi.fn();
    const entries = getEmptyMenuEntries({
      ...emptyOptions,
      isRecycleBin: true,
      onRefresh: handleRefresh,
      onEmptyRecycleBin: handleEmpty,
    });
    for (const entry of entries) {
      if ('onClick' in entry) {
        entry.onClick?.();
      }
    }
    expect(handleRefresh).toHaveBeenCalledOnce();
    expect(handleEmpty).toHaveBeenCalledOnce();
  });

  it('휴지통이 비었으면 휴지통 비우기를 고를 수 없다', () => {
    const entries = getEmptyMenuEntries({
      ...emptyOptions,
      isRecycleBin: true,
      isRecycleBinEmpty: true,
    });
    expect(
      entries.find((entry) => 'label' in entry && entry.label === '휴지통 비우기'),
    ).toMatchObject({ isDisabled: true });
  });
});
