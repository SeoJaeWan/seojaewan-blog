import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  cutMenuItem,
  emptyRecycleBinMenuItem,
  favoritePinMenuItem,
  MENU_SEPARATOR,
  openInNewWindowMenuItem,
  openMenuItem,
  renameMenuItem,
  startPinMenuItem,
  trashMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

/** 아이콘 메뉴가 보이는 상태와 동작. kind는 우클릭한 항목 종류이며 여럿이면 null이다. isPinned는 Start 고정됨에 있는지(하나일 때)이고 canTrash는 휴지통으로 보낼 수 있는지(휴지통은 보낼 수 없다)다. isRecycleBinEmpty가 true면 휴지통 비우기를 고를 수 없다. */
type ItemMenuOptions = {
  kind: WorkspaceItemKind | null;
  isPinned: boolean;
  isFavorite: boolean;
  canTrash: boolean;
  isRecycleBinEmpty: boolean;
  onOpen: () => void;
  onOpenInNewWindow: () => void;
  onCopyLink: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onCut: () => void;
  onRename: () => void;
  onTrash: () => void;
  onEmptyRecycleBin: () => void;
};

/**
 * 아이콘 우클릭 메뉴(피그마 Menu/Folder·Post·Link·RecycleBin·Multiple)의 항목을 만든다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * 이미 Start에 고정된 항목은 `시작 화면에 고정` 대신 `시작 화면에서 고정 해제`다. 휴지통으로 보낼 수 없는 항목은 삭제를 고를 수 없고,
 * 휴지통이 비었으면 휴지통 비우기를 고를 수 없다(탐색기와 같다).
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  const open = openMenuItem(options.onOpen);
  const openInNewWindow = openInNewWindowMenuItem(options.onOpenInNewWindow);
  const copyLink = copyLinkMenuItem(options.onCopyLink);
  const pin = startPinMenuItem(options.isPinned, options.onTogglePin);
  const cut = cutMenuItem(options.onCut);
  const trash = trashMenuItem(options.canTrash, options.onTrash);
  switch (options.kind) {
    case 'folder':
      return [
        open,
        openInNewWindow,
        favoritePinMenuItem(options.isFavorite, options.onToggleFavorite),
        pin,
        MENU_SEPARATOR,
        cut,
        renameMenuItem(options.onRename),
        trash,
      ];
    case 'post':
      return [open, openInNewWindow, copyLink, pin, MENU_SEPARATOR, cut, trash];
    case 'link':
      return [open, copyLink, pin, MENU_SEPARATOR, cut, trash];
    case 'recycle-bin':
      return [
        open,
        MENU_SEPARATOR,
        emptyRecycleBinMenuItem(options.isRecycleBinEmpty, options.onEmptyRecycleBin),
      ];
    case null:
      return [open, MENU_SEPARATOR, cut, trash];
  }
}
