import type { StartAllView } from '@/features/start-menu/utils/start-items/start-items';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

// `보기:` 메뉴의 선택지다(피그마 `Menu/ViewOptions`). 범주, 그리드, 간단히 차례다.
const viewMenuOptions = [
  { view: 'category', label: '범주' },
  { view: 'grid', label: '그리드' },
  { view: 'list', label: '간단히' },
] as const satisfies readonly { view: StartAllView; label: string }[];

/**
 * 모두 목록의 `보기:` 메뉴(피그마 `Menu/ViewOptions`) 항목을 만든다. 지금 보기에 확인 표시를 한다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param view 지금 보기
 * @param onViewSelect 보기를 고르면 부른다
 * @returns 메뉴 항목
 */
export function getViewMenuEntries(
  view: StartAllView,
  onViewSelect: (view: StartAllView) => void,
): MenuPopupEntry[] {
  return viewMenuOptions.map(
    /**
     * 보기 하나의 메뉴 항목을 만든다.
     * @param option 보기와 이름
     * @returns 메뉴 항목
     */
    (option): MenuPopupEntry => ({
      kind: 'checkbox',
      label: option.label,
      isChecked: option.view === view,
      onCheckedChange: () => {
        onViewSelect(option.view);
      },
    }),
  );
}
