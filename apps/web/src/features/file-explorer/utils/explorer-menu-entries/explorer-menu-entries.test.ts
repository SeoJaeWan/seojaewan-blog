import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import {
  getEmptyMenuEntries,
  getItemMenuEntries,
  getSortMenuEntries,
} from './explorer-menu-entries';

const ITEM_OPTIONS = {
  kind: 'folder',
  isInRecycleBin: false,
  isMobile: false,
  isPinned: false,
  canTrash: true,
  onOpen: vi.fn(),
  onOpenInNewTab: vi.fn(),
  onOpenInNewWindow: vi.fn(),
  onCopyLink: vi.fn(),
  onTogglePin: vi.fn(),
  onCut: vi.fn(),
  onRename: vi.fn(),
  onTrash: vi.fn(),
  onRestore: vi.fn(),
} as const;

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
  it('폴더 메뉴는 열기·새 탭에서 열기·새 창에서 열기·고정·잘라내기·이름 바꾸기·삭제다', () => {
    expect(labels(getItemMenuEntries(ITEM_OPTIONS))).toEqual([
      '열기',
      '새 탭에서 열기',
      '새 창에서 열기',
      '시작 화면에 고정',
      '-',
      '잘라내기',
      '이름 바꾸기',
      '삭제',
    ]);
  });

  it('글 메뉴는 열기·새 창에서 열기·링크 복사·고정·잘라내기·삭제다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'post' }))).toEqual([
      '열기',
      '새 창에서 열기',
      '링크 복사',
      '시작 화면에 고정',
      '-',
      '잘라내기',
      '삭제',
    ]);
  });

  it('외부 링크 메뉴는 바탕화면 메뉴에 잘라내기를 더한 것이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'link' }))).toEqual([
      '열기',
      '링크 복사',
      '시작 화면에 고정',
      '-',
      '잘라내기',
      '삭제',
    ]);
  });

  it('여러 개 메뉴는 열기·잘라내기·삭제다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: null }))).toEqual([
      '열기',
      '-',
      '잘라내기',
      '삭제',
    ]);
  });

  it('이미 Start에 고정된 항목은 시작 화면에서 고정 해제다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isPinned: true }))).toContain(
      '시작 화면에서 고정 해제',
    );
  });

  it('휴지통 안의 항목 메뉴는 복원뿐이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isInRecycleBin: true }))).toEqual(['복원']);
  });

  it('휴지통으로 보낼 수 없는 항목은 삭제를 고를 수 없다', () => {
    const entries = getItemMenuEntries({ ...ITEM_OPTIONS, canTrash: false });
    expect(entries.find((entry) => 'label' in entry && entry.label === '삭제')).toMatchObject({
      disabled: true,
    });
  });

  it('빈 곳 메뉴는 보기·정렬 기준·붙여넣기·새로 만들기다', () => {
    const entries = getEmptyMenuEntries(emptyOptions);
    expect(labels(entries)).toEqual(['보기', '정렬 기준', '-', '붙여넣기', '새로 만들기']);
  });

  it('붙여넣을 수 없으면 붙여넣기를 고를 수 없다', () => {
    const entries = getEmptyMenuEntries({ ...emptyOptions, canPaste: false });
    expect(entries.find((entry) => 'label' in entry && entry.label === '붙여넣기')).toMatchObject({
      disabled: true,
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
    ).toMatchObject({ disabled: true });
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('모바일 폴더 메뉴에는 새 탭에서 열기가 없다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isMobile: true }))).not.toContain(
      '새 탭에서 열기',
    );
  });

  it('모바일 길게 누르기 메뉴에도 옮기기 위한 잘라내기가 있다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isMobile: true }))).toContain('잘라내기');
  });
});

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('정렬 메뉴에서 내림차순을 고르면 방향을 desc로 바꾼다', () => {
    const handleDirection = vi.fn();
    const [, , direction] = getSortMenuEntries({
      ...viewOptions,
      onSortDirectionChange: handleDirection,
    });
    if (direction?.kind === 'radio-group') {
      direction.onValueChange?.('descending');
    }
    expect(handleDirection).toHaveBeenCalledWith('desc');
  });
});
