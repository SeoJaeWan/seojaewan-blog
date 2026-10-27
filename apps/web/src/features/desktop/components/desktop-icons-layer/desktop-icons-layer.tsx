import type { DragEvent, JSX, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { SelectionMarquee, Tooltip } from '@seojaewan/design-system';

import { DesktopDragGhost } from '@/features/desktop/components/desktop-drag-ghost/desktop-drag-ghost';
import type {
  DesktopIcon,
  DesktopIconProps,
} from '@/features/desktop/components/desktop-icons/desktop-icons';
import { DesktopIcons } from '@/features/desktop/components/desktop-icons/desktop-icons';
import type { ItemDropResult } from '@/features/desktop/hooks/use-item-drag/use-item-drag';
import {
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
  useItemDrag,
} from '@/features/desktop/hooks/use-item-drag/use-item-drag';
import {
  arrangeInGridOrder,
  getCellGeometry,
  getCellOrigin,
  getFirstFreeCell,
  getGridOrder,
  getGridSize,
  getNearestCell,
  layoutDesktopIcons,
  moveIconsToCell,
  sortDesktopItems,
} from '@/features/desktop/utils/desktop-grid/desktop-grid';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import { MessageBoxDialog } from '@/shared/components/message-box-dialog/message-box-dialog';
import { EMPTY_RECYCLE_BIN_MESSAGE } from '@/shared/components/message-box-empty-recycle-bin/message-box-empty-recycle-bin';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { useFolderRename } from '@/shared/hooks/use-folder-rename/use-folder-rename';
import { useMarqueeSelection } from '@/shared/hooks/use-marquee-selection/use-marquee-selection';
import { useOpenItem } from '@/shared/hooks/use-open-item/use-open-item';
import { useSelection } from '@/shared/hooks/use-selection/use-selection';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import type {
  SelectionDirection,
  SelectionRect,
} from '@/shared/utils/selection-rules/selection-rules';
import {
  emptySelection,
  getIdAfterRemoval,
  getNeighborInGrid,
  isRectIntersecting,
  selectOnly,
} from '@/shared/utils/selection-rules/selection-rules';
import type {
  DesktopIconSize,
  DesktopSortKey,
  WorkspaceItem,
} from '@/shared/utils/workspace-rules/workspace-rules';
import {
  getDesktopItems,
  isRecycleBinFull,
  trashItems,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { getDesktopMenuEntries, getItemMenuEntries } from './desktop-menu-entries';

/** 열린 우클릭 메뉴. 빈 곳 메뉴거나 아이콘 메뉴(우클릭한 항목들)다 */
type OpenMenu = { kind: 'desktop' } | { kind: 'items'; ids: readonly string[] };

// 아이콘을 표시하는 속성. 우클릭·길게 누른 자리와 방향키로 옮길 아이콘을 찾는 데 쓴다.
const ICON_ATTRIBUTE = 'data-desktop-icon';

// 이름 바꾸기 말풍선과 아이콘 사이 간격(px). 말풍선 꼬리(높이 8)가 이 사이에 들어간다.
const BALLOON_OFFSET = 8;

/**
 * 바탕화면 아이콘(`DesktopIcons`)을 작업 공간 저장소에 잇는 층이다.
 * - 배치: 작업 영역 크기로 격자를 정하고, 자동 정렬이면 정렬 기준의 차례로, 아니면 저장한 칸에 아이콘을 놓는다. 모바일은 늘 자동 정렬이다.
 * - 선택: 클릭, Ctrl·Shift + 클릭, 빈 곳에서 끄는 사각형, 방향키, Ctrl + A. 빈 곳을 누르면 선택을 지운다. 모바일은 하나만 고른다.
 * - 끌기(데스크톱): 고른 아이콘을 끌면 반투명한 복제본이 따라가고, 폴더·휴지통 위에 놓으면 옮기거나 휴지통으로 보낸다.
 *   빈 곳에 놓으면 자동 정렬이 꺼져 있을 때만 그 칸으로 옮기고, 켜져 있으면 정렬된 자리로 돌아간다. 거부되면 제자리에 둔다.
 * - 열기: 더블클릭(모바일은 탭), Enter. 키보드: Delete는 휴지통으로, F2는 폴더 이름 바꾸기.
 * - 지우면 격자 순서의 다음 아이콘(없으면 이전 아이콘, 그것도 없으면 영역)으로 선택과 포커스를 옮긴다.
 * - 모바일은 늘 자동 정렬이라 보기 메뉴의 아이콘 자동 정렬을 고를 수 없다.
 * - 우클릭(모바일은 길게 누르기) 메뉴: 빈 곳 메뉴와 항목 종류별 메뉴. 휴지통 비우기는 메시지 상자만 보여 준다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @codocs [[바탕화면:아이콘 배치]]
 * @codocs [[바탕화면:아이콘 조작]]
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[바탕화면:아이콘 우클릭 메뉴]]
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[모바일:차이]]
 * @returns 바탕화면 아이콘
 */
export function DesktopIconsLayer(): JSX.Element {
  const isMobile = useDevice() === 'mobile';
  const workArea = useWorkArea();
  const openItem = useOpenItem();
  const items = useWorkspaceStore((state) => state.items);
  const settings = useWorkspaceStore((state) => state.desktop);
  const startPins = useWorkspaceStore((state) => state.startPins);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragAnchorRef = useRef<string | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [isEmptyDialogOpen, setIsEmptyDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [focusedIconId, setFocusedIconId] = useState<string | null>(null);
  // 끄기 시작할 때 아이콘 영역 왼쪽 위의 화면 자리. 끄는 복제본을 화면 기준으로 그리는 데 쓴다.
  const [dragAreaOrigin, setDragAreaOrigin] = useState({ x: 0, y: 0 });
  // 메뉴에서 고른 이름 바꾸기(새 폴더 포함). 메뉴가 닫히며 영역으로 돌아가는 포커스에 입력창이 닫히지 않게, 닫힌 뒤 시작한다.
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  // 메뉴의 삭제로 지운 뒤 포커스를 옮길 아이콘(null이면 영역). 메뉴가 닫힌 뒤 옮긴다.
  const [pendingFocus, setPendingFocus] = useState<{ id: string | null } | null>(null);

  const iconSize = settings.iconSize;
  const isAutoArrange = isMobile || settings.autoArrange;
  const desktopItems = getDesktopItems({ items });
  const grid = workArea === null ? null : getGridSize(workArea, iconSize);
  const cells =
    grid === null ? null : layoutDesktopIcons(desktopItems, { ...settings, isAutoArrange }, grid);
  const orderedIds =
    cells === null || grid === null
      ? (isAutoArrange ? sortDesktopItems(desktopItems, settings.sortBy) : desktopItems).map(
          (item) => item.id,
        )
      : getGridOrder(cells, grid);

  const rename = useFolderRename({ onKeyboardEnd: focusIcon });
  const selection = useSelection({
    orderedIds,
    getNeighborId: findNeighborIcon,
    isMultiSelectEnabled: !isMobile,
    onFocusItem: focusIcon,
  });
  const marquee = useMarqueeSelection({
    onStart: selection.startMarquee,
    onChange: (rect: SelectionRect) => {
      selection.updateMarquee(getIconsInRect(rect));
    },
  });
  const itemDrag = useItemDrag({ onDrop: handleDrop });
  const selectedIds = selection.selection.ids;

  useEffect(
    /**
     * 새로 고침을 누르면 아이콘을 `motion/duration/faster` 동안 감췄다가 다시 보인다(깜빡임 연출).
     * @returns 기다림을 지우는 정리 함수
     */
    () => {
      if (!isRefreshing) {
        return undefined;
      }
      const timer = window.setTimeout(() => {
        setIsRefreshing(false);
      }, readCssTimeVariable('--motion-duration-faster'));
      return () => {
        window.clearTimeout(timer);
      };
    },
    [isRefreshing],
  );

  /**
   * 격자에서 방향키 방향의 옆 아이콘을 찾는다.
   * @param fromId 지금 아이콘 id
   * @param direction 방향
   * @returns 옆 아이콘 id. 없으면 null
   */
  function findNeighborIcon(fromId: string, direction: SelectionDirection): string | null {
    return cells === null ? null : getNeighborInGrid(cells, fromId, direction);
  }

  /**
   * 아이콘 요소에 키보드 포커스를 옮긴다.
   * @param id 항목 id
   */
  function focusIcon(id: string): void {
    const icon = [...(containerRef.current?.querySelectorAll(`[${ICON_ATTRIBUTE}]`) ?? [])].find(
      (element) => element.getAttribute(ICON_ATTRIBUTE) === id,
    );
    if (icon instanceof HTMLElement) {
      icon.focus();
    }
  }

  /**
   * 끄는 사각형에 걸친 아이콘을 격자 순서로 돌려준다.
   * @param rect 끄는 사각형(아이콘 영역 기준)
   * @returns 걸친 아이콘 id
   */
  function getIconsInRect(rect: SelectionRect): string[] {
    if (cells === null) {
      return [];
    }
    const { itemWidth, itemHeight } = getCellGeometry(iconSize);
    return orderedIds.filter(
      /**
       * 아이콘이 사각형에 걸쳤는지 본다.
       * @param id 항목 id
       * @returns 걸쳤으면 true
       */
      (id) => {
        const cell = cells[id];
        if (cell === undefined) {
          return false;
        }
        const origin = getCellOrigin(cell, iconSize);
        return isRectIntersecting(rect, { ...origin, width: itemWidth, height: itemHeight });
      },
    );
  }

  /**
   * 항목들을 연다.
   * @param ids 항목 id
   * @param isNewWindow 새 창에서 열기인지
   */
  function openItems(ids: readonly string[], isNewWindow = false): void {
    for (const id of ids) {
      openItem(id, { isNewWindow });
    }
  }

  /**
   * 항목들을 휴지통으로 보낸다. 보낼 수 없는 항목(`Blog`, 휴지통)이 있으면 아무것도 보내지 않는다.
   * 보냈으면 격자 순서의 다음 아이콘(없으면 이전 아이콘)을 고르고, 포커스를 옮길 아이콘을 돌려준다.
   * @param ids 항목 id
   * @returns 보냈으면 포커스를 옮길 아이콘 id(남은 아이콘이 없으면 null), 보내지 못했으면 undefined
   */
  function trash(ids: readonly string[]): string | null | undefined {
    if (ids.length === 0 || !getWorkspace().trashItems(ids).ok) {
      return undefined;
    }
    const nextId = getIdAfterRemoval(orderedIds, ids);
    selection.setSelection(nextId === null ? emptySelection : selectOnly(nextId));
    return nextId;
  }

  /**
   * 지운 뒤 포커스를 남은 아이콘(없으면 아이콘 영역)으로 옮긴다.
   * @param id 포커스를 옮길 아이콘 id. 없으면 영역
   */
  function focusAfterRemoval(id: string | null): void {
    if (id === null) {
      containerRef.current?.focus();
    } else {
      focusIcon(id);
    }
  }

  /**
   * 폴더 이름 바꾸기를 시작한다. 폴더가 아니면 하지 않는다.
   * @param id 항목 id
   */
  function startRename(id: string): void {
    const item = getWorkspace().items[id];
    if (item?.kind === 'folder') {
      selection.setSelection(selectOnly(id));
      rename.startRename(id, item.name);
    }
  }

  /**
   * 바탕화면에 새 폴더를 만들고 고른다. 자동 정렬이 꺼져 있으면 첫 빈 칸에 둔다. 이름 바꾸기는 메뉴가 닫힌 뒤 시작한다.
   * @returns 만든 폴더 id. 만들지 못하면 null
   */
  function createFolder(): string | null {
    const result = getWorkspace().createFolder(null);
    if (!result.ok) {
      return null;
    }
    if (!isAutoArrange && cells !== null && grid !== null) {
      getWorkspace().setDesktopIconPositions({ [result.id]: getFirstFreeCell(cells, grid) });
    }
    selection.setSelection(selectOnly(result.id));
    return result.id;
  }

  /**
   * 정렬 기준을 바꾼다. 자동 정렬이 꺼져 있으면 고른 기준으로 한 번 정렬해 칸을 다시 정한다.
   * @param sortBy 정렬 기준
   */
  function changeSortBy(sortBy: DesktopSortKey): void {
    getWorkspace().setDesktopSortBy(sortBy);
    if (!isAutoArrange && grid !== null) {
      const sorted = sortDesktopItems(desktopItems, sortBy).map((item) => item.id);
      getWorkspace().setDesktopIconPositions(arrangeInGridOrder(sorted, grid));
    }
  }

  /**
   * 자동 정렬을 켜거나 끈다. 끄면 지금 자리를 그대로 저장해 아이콘이 움직이지 않게 한다.
   * @param isOn 켤지
   */
  function changeAutoArrange(isOn: boolean): void {
    if (!isOn && cells !== null) {
      getWorkspace().setDesktopIconPositions(cells);
    }
    getWorkspace().setDesktopAutoArrange(isOn);
  }

  /**
   * 항목의 링크(글은 공유 링크, 외부 링크는 그 주소)를 클립보드에 복사한다.
   * @param item 항목
   */
  function copyLink(item: WorkspaceItem): void {
    const link =
      item.kind === 'post'
        ? `${window.location.origin}/posts/${item.slug}`
        : item.kind === 'link'
          ? item.url
          : null;
    if (link !== null && typeof navigator.clipboard !== 'undefined') {
      navigator.clipboard.writeText(link).catch(ignoreClipboardError);
    }
  }

  /**
   * 끈 아이콘을 놓는다. 폴더·휴지통 위면 그곳으로 옮기고(거부되면 그대로), 아이콘 영역의 빈 곳이면
   * 자동 정렬이 꺼져 있을 때만 놓은 칸으로 옮긴다. 영역 밖(작업 표시줄 등)에 놓으면 아무것도 하지 않는다.
   * @param result 놓은 결과
   */
  function handleDrop(result: ItemDropResult): void {
    if (result.target !== null) {
      getWorkspace().moveItems(result.ids, result.target.id);
      return;
    }
    const anchorId = dragAnchorRef.current;
    const anchor = anchorId === null || cells === null ? undefined : cells[anchorId];
    const isInside = result.element === null || containerRef.current?.contains(result.element);
    if (isAutoArrange || anchorId === null || anchor === undefined || grid === null || !isInside) {
      return;
    }
    const origin = getCellOrigin(anchor, iconSize);
    const dropCell = getNearestCell(
      { x: origin.x + result.delta.x, y: origin.y + result.delta.y },
      iconSize,
      grid,
    );
    if (cells !== null) {
      getWorkspace().setDesktopIconPositions(
        moveIconsToCell(cells, result.ids, anchorId, dropCell, grid),
      );
    }
  }

  /**
   * 우클릭·길게 누르기로 메뉴가 열리거나 닫힐 때. 연 자리가 아이콘이면 그 아이콘(고른 아이콘 위면 고른 아이콘 모두)의 메뉴,
   * 빈 곳이면 선택을 지우고 빈 곳 메뉴를 연다.
   * @param isOpen 열리는지
   * @param target 연 자리의 요소
   */
  function handleMenuOpenChange(isOpen: boolean, target: Element | null): void {
    if (!isOpen) {
      setMenu(null);
      return;
    }
    const id = target?.closest(`[${ICON_ATTRIBUTE}]`)?.getAttribute(ICON_ATTRIBUTE) ?? null;
    if (id === null) {
      selection.setSelection(emptySelection);
      setMenu({ kind: 'desktop' });
      return;
    }
    if (selectedIds.includes(id)) {
      setMenu({ kind: 'items', ids: selectedIds });
      return;
    }
    selection.setSelection(selectOnly(id));
    setMenu({ kind: 'items', ids: [id] });
  }

  /** 메뉴가 닫히고 포커스가 돌아간 뒤, 메뉴에서 고른 이름 바꾸기를 시작한다. */
  function handleMenuCloseComplete(): void {
    if (pendingRenameId !== null) {
      startRename(pendingRenameId);
      setPendingRenameId(null);
    }
    if (pendingFocus !== null) {
      focusAfterRemoval(pendingFocus.id);
      setPendingFocus(null);
    }
  }

  /**
   * 아이콘 영역의 빈 곳을 누르면 끄는 사각형을 시작한다(선택을 지우거나, Ctrl이면 더한다). 터치는 선택만 지운다.
   * @param event 누르기 이벤트
   */
  function handleAreaPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest(`[${ICON_ATTRIBUTE}]`) !== null) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.focus();
    const isStarted = !isMobile && marquee.startMarquee(event);
    if (isStarted) {
      // 끄는 동안 글자가 선택되지 않게 한다.
      event.preventDefault();
    } else {
      selection.setSelection(emptySelection);
    }
  }

  /**
   * 바탕화면 키를 처리한다. 방향키·Ctrl + A는 선택, Enter는 열기, Delete는 휴지통으로 보내기, F2는 폴더 이름 바꾸기다.
   * @param event 키 이벤트
   */
  function handleAreaKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (selection.handleSelectionKeyDown(event)) {
      return;
    }
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        openItems(selectedIds);
        break;
      case 'Delete':
        event.preventDefault();
        {
          const nextId = trash(selectedIds);
          if (nextId !== undefined) {
            focusAfterRemoval(nextId);
          }
        }
        break;
      case 'F2': {
        const [onlyId] = selectedIds;
        if (selectedIds.length === 1 && onlyId !== undefined) {
          event.preventDefault();
          startRename(onlyId);
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * 아이콘(FileItem)마다 선택·끌기·열기·키보드 포커스·놓을 곳 속성을 만든다.
   * @param icon 바탕화면 아이콘
   * @returns 아이콘 속성
   */
  function getIconProps(icon: DesktopIcon): DesktopIconProps {
    const { id } = icon;
    const isDropTarget = icon.kind === 'folder' || icon.kind === 'recycle-bin';
    const tabbableId = selection.selection.focusId ?? orderedIds[0];
    return {
      role: 'option',
      'aria-selected': icon.selected === true,
      tabIndex: id === tabbableId ? 0 : -1,
      [ICON_ATTRIBUTE]: id,
      [DROP_TARGET_ATTRIBUTE]: isDropTarget ? id : undefined,
      [DROP_TARGET_NAME_ATTRIBUTE]: isDropTarget ? icon.name : undefined,
      renameFieldProps: icon.renaming === true ? rename.renameFieldProps : undefined,
      onFocus: () => {
        setFocusedIconId(id);
      },
      onBlur: () => {
        setFocusedIconId((current) => (current === id ? null : current));
      },
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (icon.renaming === true || event.button !== 0) {
          return;
        }
        const next = selection.handleItemPointerDown(id, event);
        event.currentTarget.focus();
        if (!isMobile) {
          dragAnchorRef.current = id;
          const area = containerRef.current?.getBoundingClientRect();
          setDragAreaOrigin({ x: area?.left ?? 0, y: area?.top ?? 0 });
          const ids = next.ids.includes(id) ? next.ids : [id];
          if (itemDrag.startItemDrag(event, ids)) {
            // 글자 선택과 그림의 기본 끌기가 시작되지 않게 한다. 클릭·더블클릭은 그대로 일어난다.
            event.preventDefault();
          }
        }
      },
      onClick: (event: MouseEvent<HTMLDivElement>) => {
        if (itemDrag.consumeDragEnd() || icon.renaming === true || menu !== null) {
          return;
        }
        selection.handleItemClick(id, event);
        if (isMobile) {
          openItems([id]);
        }
      },
      onDoubleClick: () => {
        if (!isMobile && icon.renaming !== true) {
          openItems([id]);
        }
      },
    };
  }

  const dragTargetId = itemDrag.drag?.target?.id ?? null;
  const icons: DesktopIcon[] = isRefreshing
    ? []
    : orderedIds.flatMap(
        /**
         * 항목을 바탕화면 아이콘으로 바꾼다.
         * @param id 항목 id
         * @returns 아이콘. 항목이 없으면 빈 목록
         */
        (id) => {
          const item = items[id];
          if (item === undefined) {
            return [];
          }
          const isSelected = selectedIds.includes(id) || id === dragTargetId;
          return [
            {
              id,
              name: item.name,
              kind: item.kind,
              full: item.kind === 'recycle-bin' ? isRecycleBinFull({ items }) : undefined,
              selected: isSelected,
              focused: isSelected && id === focusedIconId,
              renaming: rename.renamingId === id,
              cell: cells?.[id],
            },
          ];
        },
      );
  const menuEntries = menu === null ? [] : getMenuEntries(menu);
  const renamingCell =
    rename.renamingId === null || cells === null ? undefined : cells[rename.renamingId];

  /**
   * 열린 메뉴의 항목을 만든다.
   * @param openMenu 열린 메뉴
   * @returns 메뉴 항목
   */
  function getMenuEntries(openMenu: OpenMenu): ReturnType<typeof getDesktopMenuEntries> {
    if (openMenu.kind === 'desktop') {
      return getDesktopMenuEntries({
        iconSize,
        isAutoArrange,
        isAutoArrangeLocked: isMobile,
        sortBy: settings.sortBy,
        onIconSizeChange: (size: DesktopIconSize) => {
          getWorkspace().setDesktopIconSize(size);
          setMenu(null);
        },
        onAutoArrangeChange: (isOn: boolean) => {
          if (!isMobile) {
            changeAutoArrange(isOn);
          }
          setMenu(null);
        },
        onSortByChange: (sortBy: DesktopSortKey) => {
          changeSortBy(sortBy);
          setMenu(null);
        },
        onRefresh: () => {
          setIsRefreshing(true);
        },
        onNewFolder: () => {
          setPendingRenameId(createFolder());
        },
      });
    }
    const { ids } = openMenu;
    const [firstId] = ids;
    const first = ids.length === 1 && firstId !== undefined ? items[firstId] : undefined;
    return getItemMenuEntries({
      kind: ids.length === 1 ? (first?.kind ?? null) : null,
      isPinned: firstId !== undefined && startPins.includes(firstId),
      canTrash: trashItems(getWorkspace(), ids, new Date().toISOString()).ok,
      onOpen: () => {
        openItems(ids);
      },
      onOpenInNewWindow: () => {
        openItems(ids, true);
      },
      onCopyLink: () => {
        if (first !== undefined) {
          copyLink(first);
        }
      },
      onTogglePin: () => {
        if (firstId === undefined) {
          return;
        }
        if (startPins.includes(firstId)) {
          getWorkspace().unpinFromStart(firstId);
        } else {
          getWorkspace().pinToStart(firstId);
        }
      },
      onRename: () => {
        if (firstId !== undefined) {
          setPendingRenameId(firstId);
        }
      },
      onTrash: () => {
        // 메뉴가 닫힌 뒤 포커스를 옮긴다(열린 메뉴가 포커스를 갖고 있다).
        const nextId = trash(ids);
        if (nextId !== undefined) {
          setPendingFocus({ id: nextId });
        }
      },
      onEmptyRecycleBin: () => {
        setIsEmptyDialogOpen(true);
      },
    });
  }

  /**
   * 휴지통 비우기 메시지 상자가 닫히면(확인, Esc) 닫힌 상태로 둔다.
   * @param isOpen 열림 여부
   */
  function handleEmptyDialogOpenChange(isOpen: boolean): void {
    setIsEmptyDialogOpen(isOpen);
  }

  const drag = itemDrag.drag;
  const overlay = (
    <>
      {marquee.marquee !== null && (
        <SelectionMarquee
          className="pointer-events-none absolute z-1"
          style={{
            left: marquee.marquee.x,
            top: marquee.marquee.y,
            width: marquee.marquee.width,
            height: marquee.marquee.height,
          }}
        />
      )}
      {drag !== null && (
        <DesktopDragGhost
          icons={icons.filter((icon) => drag.ids.includes(icon.id))}
          iconView={iconSize}
          areaOrigin={dragAreaOrigin}
          delta={drag.delta}
          pointer={drag.pointer}
          targetName={drag.target?.name ?? null}
        />
      )}
      {rename.errorMessage !== null && renamingCell !== undefined && (
        <Tooltip
          type="balloon"
          message={rename.errorMessage}
          className="absolute z-1"
          style={{
            left: getCellOrigin(renamingCell, iconSize).x,
            top:
              getCellOrigin(renamingCell, iconSize).y +
              getCellGeometry(iconSize).itemHeight +
              BALLOON_OFFSET,
          }}
        />
      )}
    </>
  );

  return (
    <>
      <ContextMenuArea
        open={menu !== null}
        onOpenChange={handleMenuOpenChange}
        onCloseComplete={handleMenuCloseComplete}
        items={menuEntries}
        area={
          <DesktopIcons
            ref={containerRef}
            role="listbox"
            aria-label="바탕화면 아이콘"
            aria-multiselectable={!isMobile}
            tabIndex={-1}
            className="outline-none"
            icons={icons}
            iconView={iconSize}
            getIconProps={getIconProps}
            overlay={overlay}
            onPointerDown={handleAreaPointerDown}
            onKeyDown={handleAreaKeyDown}
            onDragStart={handleNativeDragStart}
          />
        }
      />
      <MessageBoxDialog
        {...EMPTY_RECYCLE_BIN_MESSAGE}
        open={isEmptyDialogOpen}
        onOpenChange={handleEmptyDialogOpenChange}
      />
    </>
  );
}

/**
 * 그림·글자의 브라우저 기본 끌기(drag and drop)를 막는다. 아이콘 끌기는 포인터 이벤트로 한다.
 * @param event 끌기 시작 이벤트
 */
function handleNativeDragStart(event: DragEvent): void {
  event.preventDefault();
}

/**
 * 작업 공간 저장소의 지금 상태와 조작을 읽는다. 핸들러 안에서 쓴다.
 * @returns 저장소 상태
 */
function getWorkspace(): ReturnType<typeof useWorkspaceStore.getState> {
  return useWorkspaceStore.getState();
}

/** 클립보드에 쓰지 못하면(권한 거부 등) 조용히 넘어간다. */
function ignoreClipboardError(): void {}
