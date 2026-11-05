import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { singleChoiceEntry } from '@/shared/utils/menu-items/menu-items';
import type {
  ExplorerFolderView,
  ExplorerSortKey,
  ExplorerViewMode,
  SortDirection,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 보기·정렬 메뉴가 보이는 지금 설정과 동작 */
export type ViewMenuOptions = {
  view: ExplorerFolderView;
  onViewChange: (view: ExplorerViewMode) => void;
  onSortByChange: (sortBy: ExplorerSortKey) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
};

/**
 * 보기 메뉴(피그마 Menu/ExplorerViewSubmenu)의 항목을 만든다. 명령 모음의 보기 버튼과 빈 곳 메뉴의 보기 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 보기와 동작
 * @returns 메뉴 항목
 */
export function getViewMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return [
    singleChoiceEntry(
      options.view.view,
      [
        { value: 'large', label: '큰 아이콘' },
        { value: 'medium', label: '보통 아이콘' },
        { value: 'details', label: '자세히' },
      ],
      options.onViewChange,
    ),
  ];
}
