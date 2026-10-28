// @codocs [[디자인 시스템:조립]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립(`Menu/*`) 스토리가 실제 메뉴 함수가 만든 항목을 피그마 조립처럼 그리게 바꾸는 도우미다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

/** 스토리에서 메뉴 항목을 골라도 아무것도 하지 않는다. 메뉴 함수가 받는 동작 자리에 넣는다. */
export function ignoreMenuAction(): void {
  // 조립 스토리는 그림만 비교하므로 동작이 없다.
}

/**
 * 실제 메뉴 함수가 만든 항목을 조립 스토리 모양으로 바꾼다. 실제 하위 메뉴(`entries`)는 마우스·키보드로 여닫는 항목이라,
 * 피그마 조립이 펼친 하위 메뉴 하나만 항목 옆에 연 모습(`submenu`)으로 바꾸고 나머지는 닫힌 하위 메뉴 항목으로 둔다.
 * @param entries 실제 메뉴 함수가 만든 항목
 * @param openSubmenu 펼친 하위 메뉴 항목의 이름. 없으면 모두 닫힌 모습이다
 * @returns 스토리에 그릴 항목
 */
export function previewMenu(
  entries: readonly MenuPopupEntry[],
  openSubmenu?: string,
): MenuPopupEntry[] {
  return entries.map(
    /**
     * 하위 메뉴 항목이면 펼친 모습이나 닫힌 모습으로 바꾼다.
     * @param entry 메뉴 한 줄
     * @returns 스토리에 그릴 메뉴 한 줄
     */
    (entry) => {
      if (entry.kind !== 'submenu') {
        return entry;
      }
      const { entries: submenuEntries, ...trigger } = entry;
      return {
        ...trigger,
        submenu: entry.label === openSubmenu ? submenuEntries : undefined,
      };
    },
  );
}
