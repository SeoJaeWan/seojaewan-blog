import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getChromeMoreMenuEntries } from './chrome-more-menu';

const options = {
  isMobile: false,
  canCopyLink: true,
  canGoForward: true,
  zoom: 100,
  onCopyLink: vi.fn(),
  onFind: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomIn: vi.fn(),
  onForward: vi.fn(),
  onRefresh: vi.fn(),
};

/**
 * 메뉴 항목의 이름들(구분선은 `-`, 확대/축소 줄은 `zoom`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => {
    if ('label' in entry) {
      return entry.label;
    }
    return entry.kind === 'zoom' ? 'zoom' : '-';
  });
}

// @codocs [[Chrome:구성]]
describe('Chrome:구성', () => {
  it('데스크톱 ⋮ 메뉴는 링크 복사·페이지에서 찾기·확대/축소 줄이다', () => {
    expect(labels(getChromeMoreMenuEntries(options))).toEqual([
      '링크 복사',
      '페이지에서 찾기',
      'zoom',
    ]);
  });

  it('글을 보고 있지 않으면 링크 복사를 고를 수 없다', () => {
    const [copyLink] = getChromeMoreMenuEntries({ ...options, canCopyLink: false });
    expect(copyLink).toMatchObject({ label: '링크 복사', disabled: true });
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('모바일 ⋮ 메뉴는 앞으로·새로고침을 맨 위에 두고 찾기 단축키 글자를 보이지 않는다', () => {
    const entries = getChromeMoreMenuEntries({ ...options, isMobile: true });
    expect(labels(entries)).toEqual([
      '앞으로',
      '새로고침',
      '-',
      '링크 복사',
      '페이지에서 찾기',
      'zoom',
    ]);
    expect(entries[4]).toMatchObject({ label: '페이지에서 찾기', shortcut: undefined });
  });
});

// @codocs [[Chrome:확대/축소]]
describe('Chrome:확대/축소', () => {
  it('확대/축소 줄은 지금 배율을 보이고 끝 단계에서는 그쪽 버튼이 비활성이다', () => {
    expect(getChromeMoreMenuEntries({ ...options, zoom: 50 }).at(-1)).toMatchObject({
      kind: 'zoom',
      value: '50%',
      isZoomOutDisabled: true,
      isZoomInDisabled: false,
    });
    expect(getChromeMoreMenuEntries({ ...options, zoom: 200 }).at(-1)).toMatchObject({
      isZoomOutDisabled: false,
      isZoomInDisabled: true,
    });
  });
});
