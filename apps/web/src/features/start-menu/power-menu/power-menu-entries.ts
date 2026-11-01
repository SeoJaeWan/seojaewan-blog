import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MENU_ICONS } from '@/shared/utils/menu-items/menu-items';

/**
 * 전원 메뉴(피그마 `Menu/Power`) 항목을 만든다. 절전과 시스템 종료는 두지 않는다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[다시 시작:개요]]
 * @codocs [[디자인 시스템:조립]]
 * @param onRestart 다시 시작을 고르면 부른다
 * @returns 메뉴 항목
 */
export function getPowerMenuEntries(onRestart: () => void): MenuPopupEntry[] {
  return [{ label: '다시 시작', icon: MENU_ICONS.refresh, onClick: onRestart }];
}
