import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getItemMenuEntries } from './item-menu-entries';

const ITEM_OPTIONS = {
  kind: 'folder',
  isInRecycleBin: false,
  isMobile: false,
  isPinned: false,
  isFavorite: false,
  canTrash: true,
  onOpen: vi.fn(),
  onOpenInNewTab: vi.fn(),
  onOpenInNewWindow: vi.fn(),
  onCopyLink: vi.fn(),
  onTogglePin: vi.fn(),
  onToggleFavorite: vi.fn(),
  onCut: vi.fn(),
  onRename: vi.fn(),
  onTrash: vi.fn(),
  onRestore: vi.fn(),
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

// @codocs [[파일 탐색기:우클릭 메뉴]]
describe('파일 탐색기:우클릭 메뉴', () => {
  it('폴더 메뉴는 단추 줄 잘라내기·이름 바꾸기·삭제와 목록 열기·새 탭에서 열기·새 창에서 열기·즐겨찾기·고정이다', () => {
    expect(labels(getItemMenuEntries(ITEM_OPTIONS))).toEqual([
      '[잘라내기|이름 바꾸기|삭제]',
      '열기',
      '새 탭에서 열기',
      '새 창에서 열기',
      '즐겨찾기에 고정',
      '시작 화면에 고정',
    ]);
  });

  it('글 메뉴는 단추 줄 잘라내기·삭제와 목록 열기·새 창에서 열기·링크 복사·고정이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'post' }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
      '새 창에서 열기',
      '링크 복사',
      '시작 화면에 고정',
    ]);
  });

  it('외부 링크 메뉴는 바탕화면 메뉴와 같다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: 'link' }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
      '링크 복사',
      '시작 화면에 고정',
    ]);
  });

  it('여러 개 메뉴는 단추 줄 잘라내기·삭제와 목록 열기다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind: null }))).toEqual([
      '[잘라내기|삭제]',
      '열기',
    ]);
  });

  it('목록의 열기는 Enter를 보인다', () => {
    expect(
      getItemMenuEntries(ITEM_OPTIONS).find((entry) => 'label' in entry && entry.label === '열기'),
    ).toMatchObject({ shortcut: 'Enter' });
  });

  it('이미 Start에 고정된 항목은 시작 화면에서 고정 해제다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isPinned: true }))).toContain(
      '시작 화면에서 고정 해제',
    );
  });

  it('이미 즐겨찾기에 있는 폴더는 즐겨찾기에서 제거이고, 글과 외부 링크에는 즐겨찾기 항목이 없다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isFavorite: true }))).toContain(
      '즐겨찾기에서 제거',
    );
    for (const kind of ['post', 'link'] as const) {
      expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, kind }))).not.toContain(
        '즐겨찾기에 고정',
      );
    }
  });

  it('휴지통 안의 항목 메뉴는 복원뿐이다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isInRecycleBin: true }))).toEqual(['복원']);
  });

  it('휴지통으로 보낼 수 없는 항목은 삭제 단추가 없다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, canTrash: false }))[0]).toBe(
      '[잘라내기|이름 바꾸기]',
    );
  });
});

// @codocs [[창 동작:모바일]]
// @codocs [[반응형:입력 차이]]
describe('창 동작:모바일', () => {
  it('모바일 폴더 메뉴에는 새 탭에서 열기가 없다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isMobile: true }))).not.toContain(
      '새 탭에서 열기',
    );
  });

  it('모바일 메뉴는 열기에 Enter를 보이지 않는다', () => {
    const entries = getItemMenuEntries({ ...ITEM_OPTIONS, isMobile: true });
    expect(entries.find((entry) => 'label' in entry && entry.label === '열기')).not.toHaveProperty(
      'shortcut',
    );
  });

  it('모바일 길게 누르기 메뉴에도 옮기기 위한 잘라내기가 있다', () => {
    expect(labels(getItemMenuEntries({ ...ITEM_OPTIONS, isMobile: true }))[0]).toContain(
      '잘라내기',
    );
  });
});
