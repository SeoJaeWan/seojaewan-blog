import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  cutCommandButton,
  MENU_ICONS,
  menuCommandBar,
  openInNewWindowMenuItem,
  openItemMenuItem,
  renameCommandButton,
  startPinMenuItem,
  trashCommandButtons,
} from '@/shared/utils/menu-items/menu-items';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

/** 항목 메뉴가 보이는 상태와 동작. kind는 우클릭한 항목 종류이며 여러 개면 null이다. isInRecycleBin이면 휴지통 안의 항목이라 열 수 없고 복원만 된다. isMobile이면 탭 하나라 새 탭에서 열기가 없다. isPinned는 Start 고정됨에 있는지(하나일 때)다. */
type ItemMenuOptions = {
  kind: WorkspaceItemKind | null;
  isInRecycleBin: boolean;
  isMobile: boolean;
  isPinned: boolean;
  canTrash: boolean;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onOpenInNewWindow: () => void;
  onCopyLink: () => void;
  onTogglePin: () => void;
  onCut: () => void;
  onRename: () => void;
  onTrash: () => void;
  onRestore: () => void;
};

/**
 * 항목 우클릭 메뉴(피그마 Menu/ExplorerFolder·ExplorerPost)의 항목을 만든다. 외부 링크와 여러 개는 바탕화면 메뉴(Menu/Link·Multiple)와
 * 같고, 휴지통 안의 항목은 복원만 있다(Menu/RecycleItem). 모바일은 새 탭에서 열기가 없다.
 * 잘라내기·이름 바꾸기·삭제는 단추 줄에 두고, 목록의 열기에 `Enter`를 보인다([[바탕화면 우클릭 메뉴:아이콘]]과 같다).
 * 이미 Start에 고정된 항목은 `시작 화면에서 고정 해제`다. 단추에는 비활성 모양이 없어 휴지통으로 보낼 수 없으면 삭제 단추를 뺀다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @codocs [[창 동작:모바일]]
 * @codocs [[반응형:입력 차이]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  if (options.isInRecycleBin) {
    return [{ label: '복원', icon: MENU_ICONS.restore, onClick: options.onRestore }];
  }
  const open = openItemMenuItem(options.onOpen);
  const openInNewTab = {
    label: '새 탭에서 열기',
    icon: MENU_ICONS.add,
    onClick: options.onOpenInNewTab,
  };
  const openInNewWindow = openInNewWindowMenuItem(options.onOpenInNewWindow);
  const copyLink = copyLinkMenuItem(options.onCopyLink);
  const pin = startPinMenuItem(options.isPinned, options.onTogglePin);
  const cut = cutCommandButton(options.onCut);
  const trash = trashCommandButtons(options.canTrash, options.onTrash);
  switch (options.kind) {
    case 'folder':
      return [
        ...menuCommandBar([cut, renameCommandButton(options.onRename), ...trash]),
        open,
        ...(options.isMobile ? [] : [openInNewTab]),
        openInNewWindow,
        pin,
      ];
    case 'post':
      return [...menuCommandBar([cut, ...trash]), open, openInNewWindow, copyLink, pin];
    case 'link':
      return [...menuCommandBar([cut, ...trash]), open, copyLink, pin];
    case 'recycle-bin':
    case null:
      return [...menuCommandBar([cut, ...trash]), open];
  }
}
