import type { MenuPopupCommand } from '@/shared/components/menu-popup/menu-popup';

/** 탭 검색 메뉴 한 줄이 보이는 탭. 제목만 쓴다 */
type ChromeTabSearchTab = {
  title: string;
};

// 탭 목록 줄의 아이콘이다. 탭 파비콘과 같은 Chrome 창 안의 Material 글 아이콘이다.
const TAB_ICON = 'icons/ic_material_description_20_outlined.svg';

/**
 * Chrome 탭 검색(⌄) 메뉴(피그마 Menu/ChromeTabSearch) 항목을 만든다. 열린 탭을 탭 줄 순서대로 글 아이콘과 탭 제목으로 보이고,
 * 항목을 고르면 그 탭으로 옮긴다. 실제 Chrome의 검색칸과 최근에 닫은 탭은 두지 않는다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Chrome:구성]]
 * @codocs [[디자인 시스템:조립]]
 * @param tabs 열린 탭(탭 줄 순서)
 * @param onTabSelect 탭 항목을 골랐을 때. 고른 탭의 차례를 받는다
 * @returns 메뉴 항목
 */
export function getChromeTabSearchMenuEntries(
  tabs: readonly ChromeTabSearchTab[],
  onTabSelect: (index: number) => void,
): MenuPopupCommand[] {
  return tabs.map(
    /**
     * 탭 하나의 항목을 만든다.
     * @param tab 탭
     * @param index 차례
     * @returns 메뉴 항목
     */
    (tab, index) => ({
      label: tab.title,
      icon: TAB_ICON,
      onClick: () => {
        onTabSelect(index);
      },
    }),
  );
}
