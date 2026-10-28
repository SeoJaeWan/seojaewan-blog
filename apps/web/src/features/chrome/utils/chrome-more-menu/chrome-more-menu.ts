import { canZoomIn, canZoomOut, formatZoom } from '@/features/chrome/utils/chrome-zoom/chrome-zoom';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { copyLinkMenuItem, MENU_ICONS, MENU_SEPARATOR } from '@/shared/utils/menu-items/menu-items';

/** ⋮ 메뉴가 보이는 상태와 동작 */
type ChromeMoreMenuOptions = {
  /** 모바일인지. 모바일은 앞으로·새로고침을 메뉴 맨 위에 두고 단축키 글자를 보이지 않는다 */
  isMobile: boolean;
  /** 링크를 복사할 수 있는지(글을 보고 있을 때) */
  canCopyLink: boolean;
  /** 앞으로 갈 수 있는지(모바일) */
  canGoForward: boolean;
  /** 지금 배율(%) */
  zoom: number;
  /** 링크 복사 */
  onCopyLink: () => void;
  /** 페이지에서 찾기 */
  onFind: () => void;
  /** 배율 줄이기(−) */
  onZoomOut: () => void;
  /** 배율 키우기(+) */
  onZoomIn: () => void;
  /** 앞으로(모바일) */
  onForward: () => void;
  /** 새로고침(모바일) */
  onRefresh: () => void;
};

/**
 * Chrome ⋮ 메뉴(피그마 Menu/ChromeMore, Menu/ChromeMoreMobile) 항목을 만든다. 링크 복사는 글을 보고 있을 때만 된다.
 * 확대/축소 줄은 −·+로 배율을 바꾸고 끝 단계에서는 그쪽 버튼이 비활성이다. 모바일은 앞으로·새로고침을 메뉴 맨 위에 둔다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Chrome:구성]]
 * @codocs [[Chrome:확대/축소]]
 * @codocs [[모바일:차이]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 상태와 동작
 * @returns 메뉴 항목
 */
export function getChromeMoreMenuEntries(options: ChromeMoreMenuOptions): MenuPopupEntry[] {
  const entries: MenuPopupEntry[] = [
    copyLinkMenuItem(options.onCopyLink, !options.canCopyLink),
    {
      label: '페이지에서 찾기',
      icon: MENU_ICONS.search,
      shortcut: options.isMobile ? undefined : 'Ctrl+F',
      onClick: options.onFind,
    },
    {
      kind: 'zoom',
      value: formatZoom(options.zoom),
      onZoomOut: options.onZoomOut,
      onZoomIn: options.onZoomIn,
      isZoomOutDisabled: !canZoomOut(options.zoom),
      isZoomInDisabled: !canZoomIn(options.zoom),
    },
  ];
  if (!options.isMobile) {
    return entries;
  }
  return [
    {
      label: '앞으로',
      icon: MENU_ICONS.arrowRight,
      disabled: !options.canGoForward,
      onClick: options.onForward,
    },
    { label: '새로고침', icon: MENU_ICONS.refresh, onClick: options.onRefresh },
    MENU_SEPARATOR,
    ...entries,
  ];
}
