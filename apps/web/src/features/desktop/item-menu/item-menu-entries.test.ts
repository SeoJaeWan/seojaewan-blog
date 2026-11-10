import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getItemMenuEntries } from './item-menu-entries';

const ITEM_OPTIONS = {
  kind: 'folder',
  isPinned: true,
  canTrash: true,
  isRecycleBinEmpty: false,
  onOpen: vi.fn(),
  onOpenInNewWindow: vi.fn(),
  onCopyLink: vi.fn(),
  onTogglePin: vi.fn(),
  onCut: vi.fn(),
  onRename: vi.fn(),
  onTrash: vi.fn(),
  onEmptyRecycleBin: vi.fn(),
} as const;

/**
 * 메뉴 항목의 이름들(구분선은 `-`, 단추 줄은 `[단추|단추]`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => {
    if (entry.kind === 'command-bar') {
      return `[${entry.buttons.map((button) => button.label).join('|')}]`;
    }
    return 'label' in entry ? entry.label : '-';
  });
}

/**
 * 이름으로 메뉴 항목을 찾는다.
 * @param entries 메뉴 항목
 * @param label 항목 이름
 * @returns 메뉴 항목
 */
function findEntry(entries: readonly MenuPopupEntry[], label: string): MenuPopupEntry | undefined {
  return entries.find((entry) => 'label' in entry && entry.label === label);
}

// @codocs [[바탕화면 우클릭 메뉴:아이콘]]
describe('바탕화면 우클릭 메뉴:아이콘', () => {
  it('폴더 메뉴는 단추 줄 잘라내기·이름 바꾸기·삭제와 목록 열기·새 창에서 열기·고정이고, 고정된 항목은 고정 해제를 보인다', () => {
    expect(labels(getItemMenuEntries(ITEM_OPTIONS))).toEqual([
      '[잘라내기|이름 바꾸기|삭제]',
      '열기',
      '새 창에서 열기',
      '시작 화면에서 고정 해제',
    ]);
  });

  it('글 메뉴는 단추 줄 잘라내기·삭제와 목록 열기·새 창에서 열기·링크 복사·고정이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'post', isPinned: false }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
      '새 창에서 열기',
      '링크 복사',
      '시작 화면에 고정',
    ]);
  });

  it('외부 링크 메뉴는 단추 줄 잘라내기·삭제와 목록 열기·링크 복사·고정이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'link' }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
      '링크 복사',
      '시작 화면에서 고정 해제',
    ]);
  });

  it('휴지통 메뉴는 단추 줄 없이 열기·휴지통 비우기이고, 열기에 Enter가 없다', () => {
    const entries = getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'recycle-bin' });
    expect(labels(entries)).toEqual(['열기', '-', '휴지통 비우기']);
    expect(findEntry(entries, '열기')).not.toHaveProperty('shortcut');
  });

  it('여러 개를 고른 메뉴는 단추 줄 잘라내기·삭제와 목록 열기다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: null }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
    ]);
  });

  it('목록의 열기는 Enter를 보이고, 단추는 툴팁에 단축키를 보인다', () => {
    const entries = getItemMenuEntries(ITEM_OPTIONS);
    expect(findEntry(entries, '열기')).toMatchObject({ shortcut: 'Enter' });
    expect(entries[0]).toMatchObject({
      kind: 'command-bar',
      buttons: [{ shortcut: 'Ctrl+X' }, { shortcut: 'F2' }, { shortcut: 'Delete' }],
    });
  });

  it('휴지통으로 보낼 수 없으면 삭제 단추가 없다', () => {
    const entries = getItemMenuEntries({ ...ITEM_OPTIONS, kind: null, canTrash: false });
    expect(labels(entries)).toEqual(['[잘라내기]', '열기']);
  });

  it('휴지통이 비었으면 휴지통 비우기를 고를 수 없다', () => {
    const entries = getItemMenuEntries({
      ...ITEM_OPTIONS,
      kind: 'recycle-bin',
      isRecycleBinEmpty: true,
    });
    expect(findEntry(entries, '휴지통 비우기')).toMatchObject({ isDisabled: true });
  });
});
