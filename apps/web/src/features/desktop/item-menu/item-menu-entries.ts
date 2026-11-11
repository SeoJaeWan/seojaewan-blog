import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  cutCommandButton,
  emptyRecycleBinMenuItem,
  favoritePinMenuItem,
  MENU_SEPARATOR,
  menuCommandBar,
  openInNewWindowMenuItem,
  openItemMenuItem,
  openMenuItem,
  renameCommandButton,
  startPinMenuItem,
  trashCommandButtons,
} from '@/shared/utils/menu-items/menu-items';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

/** 아이콘 메뉴가 보이는 상태와 동작. kind는 우클릭한 항목 종류이며 여럿이면 null이다. isMobile이면 모바일이라 단축키 글자를 보이지 않는다. isPinned는 Start 고정됨에 있는지(하나일 때)이고 canTrash는 휴지통으로 보낼 수 있는지(휴지통은 보낼 수 없다)다. isRecycleBinEmpty가 true면 휴지통 비우기를 고를 수 없다. */
type ItemMenuOptions = {
  kind: WorkspaceItemKind | null;
  isMobile: boolean;
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
 * 잘라내기·이름 바꾸기·삭제는 단추 줄에 두고, 목록의 열기에 `Enter`를 보인다(모바일은 단축키 글자를 보이지 않는다). 휴지통은 단추 줄 없이 목록만이다.
 * 이미 Start에 고정된 항목은 `시작 화면에 고정` 대신 `시작 화면에서 고정 해제`다. 단추에는 비활성 모양이 없어
 * 휴지통으로 보낼 수 없으면 삭제 단추를 빼고, 휴지통이 비었으면 휴지통 비우기를 고를 수 없다(탐색기와 같다).
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  const open = openItemMenuItem(options.onOpen, options.isMobile);
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
        openInNewWindow,
        favoritePinMenuItem(options.isFavorite, options.onToggleFavorite),
        pin,
      ];
    case 'post':
      return [...menuCommandBar([cut, ...trash]), open, openInNewWindow, copyLink, pin];
    case 'link':
      return [...menuCommandBar([cut, ...trash]), open, copyLink, pin];
    case 'recycle-bin':
      // 피그마 Menu/RecycleBin은 지금처럼 목록만이고 열기에 Enter가 없다.
      return [
        openMenuItem(options.onOpen),
        MENU_SEPARATOR,
        emptyRecycleBinMenuItem(options.isRecycleBinEmpty, options.onEmptyRecycleBin),
      ];
    case null:
      return [...menuCommandBar([cut, ...trash]), open];
  }
}
