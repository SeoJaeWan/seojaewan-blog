// @codocs [[디자인 시스템:조립]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립(`Menu/*`) 스토리가 실제 메뉴 함수가 만든 항목을 피그마 조립처럼 그리게 바꾸는 도우미다.
import type { MenuPopupEntry } from './menu-popup';

/** 스토리에서 메뉴 항목을 골라도 아무것도 하지 않는다. 메뉴 함수가 받는 동작 자리에 넣는다. */
export function ignoreMenuAction(): void {
  // 조립 스토리는 그림만 비교하므로 동작이 없다.
}

/**
 * 실제 메뉴 함수가 만든 항목을 조립 스토리 모양으로 바꾼다. 실제 하위 메뉴(`entries`)는 마우스·키보드로 여닫는 항목이라,
 * 피그마 조립처럼 하위 메뉴를 닫은 항목으로만 그린다. 하위 메뉴가 열리는 동작과 항목은 `play` 동작 스토리가 실제 메뉴로 확인한다.
 * @param entries 실제 메뉴 함수가 만든 항목
 * @returns 스토리에 그릴 항목
 */
export function previewMenu(entries: readonly MenuPopupEntry[]): MenuPopupEntry[] {
  return entries.map(
    /**
     * 하위 메뉴 항목이면 닫은 모습으로 바꾼다.
     * @param entry 메뉴 한 줄
     * @returns 스토리에 그릴 메뉴 한 줄
     */
    (entry) =>
      entry.kind === 'submenu'
        ? { kind: 'submenu', label: entry.label, icon: entry.icon, disabled: entry.disabled }
        : entry,
  );
}
