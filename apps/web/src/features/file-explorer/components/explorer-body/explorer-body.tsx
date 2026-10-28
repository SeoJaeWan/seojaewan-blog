import {
  type ComponentProps,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Asset,
  DetailsHeader,
  FileItem,
  FileRow,
  ImageAsset,
  SelectionMarquee,
  Tooltip,
} from '@seojaewan/design-system';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-content/explorer-content';
import {
  formatDeletedDate,
  getExplorerLocationName,
  getOriginalLocation,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import {
  getEmptyMenuEntries,
  getItemMenuEntries,
  getRecycleBinSortMenuEntries,
  getSortMenuEntries,
  getViewMenuEntries,
} from '@/features/file-explorer/utils/explorer-menu-entries/explorer-menu-entries';
import {
  getItemLocationLabel,
  searchItems,
} from '@/features/file-explorer/utils/explorer-search/explorer-search';
import {
  type ExplorerDetailsColumn,
  formatModifiedDate,
  getItemTypeLabel,
  getSortAfterColumnClick,
  getSortColumn,
  sortExplorerItems,
} from '@/features/file-explorer/utils/explorer-sort/explorer-sort';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import {
  ItemDragGhost,
  type ItemDragGhostItem,
} from '@/shared/components/item-drag-ghost/item-drag-ghost';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MessageBoxDialog } from '@/shared/components/message-box-dialog/message-box-dialog';
import { EMPTY_RECYCLE_BIN_MESSAGE } from '@/shared/components/message-box-empty-recycle-bin/message-box-empty-recycle-bin';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useFolderRename } from '@/shared/hooks/use-folder-rename/use-folder-rename';
import {
  DESKTOP_DROP_TARGET,
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
  type ItemDropResult,
  toDropLocation,
  useItemDrag,
} from '@/shared/hooks/use-item-drag/use-item-drag';
import { useMarqueeSelection } from '@/shared/hooks/use-marquee-selection/use-marquee-selection';
import { useOpenItem } from '@/shared/hooks/use-open-item/use-open-item';
import type { PointerPoint } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { useSelection } from '@/shared/hooks/use-selection/use-selection';
import { useItemClipboardStore } from '@/shared/stores/item-clipboard-store/item-clipboard-store';
import { useItemDragStore } from '@/shared/stores/item-drag-store/item-drag-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { copyItemLink } from '@/shared/utils/item-link/item-link';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import {
  emptySelection,
  getIdAfterRemoval,
  getNeighborInGrid,
  isRectIntersecting,
  type SelectionCell,
  type SelectionDirection,
  type SelectionRect,
  selectOnly,
} from '@/shared/utils/selection-rules/selection-rules';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';
import {
  DEFAULT_EXPLORER_VIEW,
  DESKTOP_LOCATION_KEY,
  type ExplorerFolderView,
  getChildItems,
  getPasteIds,
  moveItems,
  type PlacedItem,
  RECYCLE_BIN_ID,
  trashItems,
  type WorkspaceItem,
} from '@/shared/utils/workspace-rules/workspace-rules';

type ExplorerContentProps = ComponentProps<typeof ExplorerContent>;

type ExplorerBodyProps = Pick<
  ExplorerContentProps,
  | 'locationIcon'
  | 'searchPlaceholder'
  | 'path'
  | 'navigation'
  | 'backDisabled'
  | 'forwardDisabled'
  | 'upDisabled'
  | 'onBack'
  | 'onForward'
  | 'onUp'
  | 'onKeyDown'
> & {
  /** 화면 방식 */
  device: Device;
  /** 보고 있는 위치(폴더 id, 휴지통 id, 바탕화면은 null) */
  location: ExplorerLocation;
  /** 같은 탭에서 폴더로 간다 */
  onNavigate: (location: ExplorerLocation) => void;
  /** 폴더를 새 탭에서 연다 */
  onOpenInNewTab: (location: ExplorerLocation) => void;
};

/** 열린 우클릭 메뉴. 빈 곳 메뉴거나 항목 메뉴(우클릭한 항목들)다 */
type OpenMenu = { kind: 'empty' } | { kind: 'items'; ids: readonly string[] };

/** 폴더 안 검색 상태 */
type ExplorerSearchState = {
  /** 검색어를 입력한 위치. 다른 위치로 가면 검색을 끝낸다 */
  location: ExplorerLocation;
  /** 검색어 */
  query: string;
  /** 모바일 검색 줄이 열렸는지. 데스크톱은 쓰지 않는다 */
  isOpen: boolean;
};

// 항목을 표시하는 속성. 우클릭·길게 누른 자리와 방향키로 옮길 항목을 찾는 데 쓴다.
const ITEM_ATTRIBUTE = 'data-explorer-item';

// 이름 바꾸기 말풍선과 항목 사이 간격(px). 말풍선 꼬리(높이 8)가 이 사이에 들어간다.
const BALLOON_OFFSET = 8;

// 아이콘 보기의 FileItem View다.
const ICON_VIEWS = { large: 'large', medium: 'medium' } as const;

/**
 * 탐색기 본문(`ExplorerContent`)을 작업 공간 저장소에 잇는다. 보고 있는 위치의 항목을 폴더마다 기억한 보기(큰 아이콘·보통 아이콘·자세히)와
 * 정렬(폴더를 앞에 두고 이름·수정한 날짜·유형, 방향)로 그리고, 항목 조작을 붙인다.
 * - 선택: 클릭, Ctrl·Shift + 클릭(표시 순서 범위), 빈 곳에서 끄는 사각형, 방향키, Ctrl + A. 모바일은 하나만 고른다.
 * - 열기: 더블클릭(모바일은 탭)·Enter. 폴더 하나는 같은 탭에서 가고, 글·외부 링크는 열기 규칙대로 연다. 여러 개를 고르면 모두 연다(폴더는 새 창).
 * - 새 폴더(만든 뒤 이름 바꾸기), F2 이름 바꾸기, Delete 휴지통으로, Ctrl + X 잘라내기, Ctrl + V 붙여넣기(옮기기만).
 * - 명령 모음, 우클릭(모바일은 길게 누르기) 메뉴, 상태 줄(항목 수, 선택 수, 자세히·큰 아이콘 보기).
 * - 휴지통은 늘 자세히 보기(이름·원래 위치·삭제한 날짜)이고 항목을 열 수 없으며 복원만 된다. 휴지통 비우기는 메시지 상자만 보인다.
 * - 폴더 안 검색. 모바일은 주소 줄의 검색 버튼으로 검색 줄을 열고, ← 버튼·Esc·다른 위치로 가기로 검색어를 지우며 닫는다.
 * 쓸 수 없는 조작(같은 이름 충돌, 자기·하위 폴더로 옮기기)은 명령과 메뉴를 비활성으로 두고, 거부되면 제자리다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @codocs [[파일 탐색기:폴더 안 검색]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ExplorerBody(props: ExplorerBodyProps): JSX.Element {
  const {
    device,
    location,
    onNavigate,
    onOpenInNewTab,
    onKeyDown: handleNavigationKeyDown,
    ...contentProps
  } = props;
  const isMobile = device === 'mobile';
  const isRecycleBin = location === RECYCLE_BIN_ID;
  const items = useWorkspaceStore((state) => state.items);
  const explorerViews = useWorkspaceStore((state) => state.explorerViews);
  const startPins = useWorkspaceStore((state) => state.startPins);
  const cutIds = useItemClipboardStore((state) => state.cutIds);
  const openItem = useOpenItem();
  const areaRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [isEmptyDialogOpen, setIsEmptyDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  // 메뉴에서 고른 이름 바꾸기(새 폴더 포함). 메뉴가 닫히며 돌아가는 포커스에 입력창이 닫히지 않게, 닫힌 뒤 시작한다.
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  // 메뉴의 삭제로 지운 뒤 포커스를 옮길 항목(null이면 항목 자리). 메뉴가 닫힌 뒤 옮긴다.
  const [pendingFocus, setPendingFocus] = useState<{ id: string | null } | null>(null);
  // 폴더 안 검색어와 모바일 검색 줄이 열렸는지. 입력한 위치와 함께 두어, 다른 위치로 가면 검색어가 없는 원래 보기와
  // 원래 주소 줄로 돌아간다.
  const [search, setSearch] = useState<ExplorerSearchState>({
    location,
    query: '',
    isOpen: false,
  });
  // 끌기를 시작할 때 끄는 항목의 화면 자리. 끄는 복제본을 그리는 데 쓴다.
  const [dragOrigins, setDragOrigins] = useState<Readonly<Record<string, PointerPoint>>>({});
  const dragTargetId = useItemDragStore((state) => state.targetId);

  const workspace = { items };
  const savedView = explorerViews[location ?? DESKTOP_LOCATION_KEY] ?? DEFAULT_EXPLORER_VIEW;
  const view: ExplorerFolderView = isRecycleBin ? { ...savedView, view: 'details' } : savedView;
  if (search.location !== location) {
    // 다른 위치로 가면 검색을 끝낸다. 돌아와도 앞의 검색어가 되살아나지 않는다.
    setSearch(endSearch(location));
  }
  // 모바일은 주소 줄의 검색 버튼으로 연 검색 줄에서만 검색한다. 데스크톱은 검색 상자가 늘 보인다.
  const isMobileSearchOpen = isMobile && search.location === location && search.isOpen;
  const query =
    search.location !== location || (isMobile && !isMobileSearchOpen) ? '' : search.query;
  const isSearching = query.trim() !== '';
  const children = isSearching
    ? searchItems(workspace, location, query)
    : sortExplorerItems(
        getChildItems(workspace, location).filter(
          (item): item is PlacedItem => item.kind !== 'recycle-bin',
        ),
        view,
        workspace,
        isRecycleBin,
      );
  const orderedIds = children.map((item) => item.id);
  const cutSet = new Set(cutIds);
  const pasteIds = isRecycleBin
    ? null
    : getPasteIds(getWorkspace(), cutIds, location, new Date().toISOString());
  const canPaste = pasteIds !== null;

  const rename = useFolderRename({ onKeyboardEnd: focusItemAfterRender });
  const selection = useSelection({
    orderedIds,
    getNeighborId: findNeighborItem,
    isMultiSelectEnabled: !isMobile,
    onFocusItem: focusItem,
  });
  const marquee = useMarqueeSelection({
    onStart: selection.startMarquee,
    onChange: (rect: SelectionRect) => {
      selection.updateMarquee(getItemsInRect(rect));
    },
  });
  const itemDrag = useItemDrag({
    onDrop: handleItemDrop,
    canDrop: canDropOn,
    // 지금 보는 위치(이 창의 본문)는 놓을 곳이 아닐 뿐 막힌 곳이 아니라 `not-allowed` 커서를 보이지 않는다.
    isNeutralTarget: (targetId: string) => toDropLocation(targetId) === location,
  });
  const selectedIds = selection.selection.ids;
  const [onlySelectedId] = selectedIds;
  const onlySelected =
    selectedIds.length === 1 && onlySelectedId !== undefined ? items[onlySelectedId] : undefined;
  const canTrash =
    !isRecycleBin &&
    selectedIds.length > 0 &&
    trashItems(getWorkspace(), selectedIds, new Date().toISOString()).ok;
  // 휴지통이 비었는지. 검색 결과가 아니라 휴지통에 실제로 든 항목으로 본다.
  const isRecycleBinEmpty = isRecycleBin && getChildItems(workspace, RECYCLE_BIN_ID).length === 0;

  useEffect(
    /**
     * 새로 고침을 누르면 항목을 `motion/duration/faster` 동안 감췄다가 다시 보인다(바탕화면 새로 고침과 같은 깜빡임).
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
   * 항목 요소를 찾는다.
   * @param id 항목 id
   * @returns 항목 요소. 없으면 null
   */
  function findItemElement(id: string): HTMLElement | null {
    const element = [...(areaRef.current?.querySelectorAll(`[${ITEM_ATTRIBUTE}]`) ?? [])].find(
      (candidate) => candidate.getAttribute(ITEM_ATTRIBUTE) === id,
    );
    return element instanceof HTMLElement ? element : null;
  }

  /**
   * 항목 요소에 키보드 포커스를 옮긴다.
   * @param id 항목 id
   */
  function focusItem(id: string): void {
    findItemElement(id)?.focus();
  }

  /**
   * 다음 그리기가 끝난 뒤 항목에 키보드 포커스를 옮긴다. 이름을 바꾸던 항목은 말풍선 상자를 벗으며 다시 그려지기 때문이다.
   * @param id 항목 id
   */
  function focusItemAfterRender(id: string): void {
    window.setTimeout(() => {
      focusItem(id);
    });
  }

  /**
   * 보이는 항목의 자리를 줄·칸으로 바꾼다. 아이콘 보기는 줄 바꿈한 격자, 자세히 보기는 한 줄짜리 목록이다.
   * @returns 항목 id별 칸
   */
  function measureCells(): Record<string, SelectionCell> {
    const elements = orderedIds.flatMap(
      /**
       * 항목 하나의 자리를 잰다.
       * @param id 항목 id
       * @returns 자리. 그려지지 않았으면 빈 목록
       */
      (id) => {
        const element = findItemElement(id);
        const rect = element === null ? null : getRectInArea(element, areaRef.current);
        return rect === null ? [] : [{ id, left: rect.x, top: rect.y }];
      },
    );
    const lefts = [...new Set(elements.map((element) => element.left))].sort((a, b) => a - b);
    const tops = [...new Set(elements.map((element) => element.top))].sort((a, b) => a - b);
    return Object.fromEntries(
      elements.map((element) => [
        element.id,
        { column: lefts.indexOf(element.left), row: tops.indexOf(element.top) },
      ]),
    );
  }

  /**
   * 방향키 방향의 옆 항목을 찾는다.
   * @param fromId 지금 항목 id
   * @param direction 방향
   * @returns 옆 항목 id. 없으면 null
   */
  function findNeighborItem(fromId: string, direction: SelectionDirection): string | null {
    return getNeighborInGrid(measureCells(), fromId, direction);
  }

  /**
   * 끄는 사각형에 걸친 항목을 표시 순서로 돌려준다.
   * @param rect 끄는 사각형(항목 자리 기준)
   * @returns 걸친 항목 id
   */
  function getItemsInRect(rect: SelectionRect): string[] {
    return orderedIds.filter((id) => {
      const element = findItemElement(id);
      return element !== null && isRectIntersecting(rect, getRectInArea(element, areaRef.current));
    });
  }

  /**
   * 항목이 끌어 놓을 곳인지. 휴지통 밖의 폴더만 놓을 곳이다.
   * @param item 항목
   * @returns 놓을 곳이면 true
   */
  function canBeDropTarget(item: PlacedItem): boolean {
    return !isRecycleBin && item.kind === 'folder';
  }

  /**
   * 끄는 항목들의 화면 자리를 잰다. 끄는 복제본이 이 자리에서 시작한다.
   * @param ids 끄는 항목 id
   * @returns 항목 id별 화면 자리
   */
  function measureDragOrigins(ids: readonly string[]): Record<string, PointerPoint> {
    return Object.fromEntries(
      ids.flatMap((id) => {
        const rect = findItemElement(id)?.getBoundingClientRect();
        return rect === undefined ? [] : [[id, { x: rect.left, y: rect.top }]];
      }),
    );
  }

  /**
   * 끄는 항목을 놓을 곳으로 옮길 수 있는지 본다. 끄는 항목이 모두 이미 그 위치에 있으면(이 창의 빈 곳) 놓을 곳이 아니고,
   * 검색 중에는 이 창의 본문도 놓을 곳이 아니다.
   * @codocs [[파일 탐색기:조작]]
   * @param ids 끄는 항목 id
   * @param targetId 놓을 곳 id
   * @returns 옮길 수 있으면 true
   */
  function canDropOn(ids: readonly string[], targetId: string): boolean {
    const target = toDropLocation(targetId);
    // 검색 결과는 하위 폴더의 항목도 보이므로, 검색 중에는 이 창의 본문(지금 위치)을 놓을 곳으로 보지 않는다.
    if ((isSearching && target === location) || ids.every((id) => items[id]?.parentId === target)) {
      return false;
    }
    return moveItems(getWorkspace(), ids, target, new Date().toISOString()).ok;
  }

  /**
   * 끈 항목을 놓는다. 같은 창의 폴더, 탐색 창 칸, 다른 탐색기 창, 바탕화면(빈 곳·폴더·휴지통) 위면 그곳으로 옮긴다.
   * 놓을 곳이 아니면(옮길 수 없는 곳 포함) 제자리다.
   * @codocs [[파일 탐색기:조작]]
   * @param result 놓은 결과
   */
  function handleItemDrop(result: ItemDropResult): void {
    if (result.target !== null) {
      getWorkspace().moveItems(result.ids, toDropLocation(result.target.id));
    }
  }

  /**
   * 폴더 보기와 정렬을 바꾼다(폴더마다 기억한다).
   * @param next 바꿀 값
   */
  function changeView(next: Partial<ExplorerFolderView>): void {
    getWorkspace().setExplorerView(location, next);
  }

  /**
   * 항목들을 연다. 폴더 하나는 같은 탭에서 가고, 그 밖은 열기 규칙대로 연다(폴더는 새 창, 글은 Chrome, 외부 링크는 새 탭).
   * 휴지통 안의 항목은 열 수 없다.
   * @param ids 항목 id
   * @param isNewWindow 새 창에서 열기인지
   */
  function openItems(ids: readonly string[], isNewWindow = false): void {
    if (isRecycleBin) {
      return;
    }
    const [onlyId] = ids;
    if (
      !isNewWindow &&
      ids.length === 1 &&
      onlyId !== undefined &&
      items[onlyId]?.kind === 'folder'
    ) {
      onNavigate(onlyId);
      return;
    }
    for (const id of ids) {
      openItem(id, { isNewWindow });
    }
  }

  /**
   * 항목들을 휴지통으로 보낸다. 보낼 수 없는 항목이 있으면 아무것도 보내지 않는다.
   * 보냈으면 표시 순서의 다음 항목(없으면 이전 항목)을 고르고, 포커스를 옮길 항목을 돌려준다.
   * @param ids 항목 id
   * @returns 보냈으면 포커스를 옮길 항목 id(남은 항목이 없으면 null), 보내지 못했으면 undefined
   */
  function trash(ids: readonly string[]): string | null | undefined {
    if (isRecycleBin || ids.length === 0 || !getWorkspace().trashItems(ids).ok) {
      return undefined;
    }
    const nextId = getIdAfterRemoval(orderedIds, ids);
    selection.setSelection(nextId === null ? emptySelection : selectOnly(nextId));
    return nextId;
  }

  /**
   * 지운 뒤 포커스를 남은 항목(없으면 항목 자리)으로 옮긴다.
   * @param id 포커스를 옮길 항목 id. 없으면 항목 자리
   */
  function focusAfterRemoval(id: string | null): void {
    if (id === null) {
      areaRef.current?.focus();
    } else {
      focusItem(id);
    }
  }

  /**
   * 휴지통의 항목들을 원래 위치로 복원한다.
   * @param ids 항목 id
   */
  function restore(ids: readonly string[]): void {
    const restorable = getRestorableIds(ids);
    if (isRecycleBin && restorable.length > 0) {
      getWorkspace().restoreItems(restorable);
    }
  }

  /**
   * 복원할 수 있는 항목만 거른다. 휴지통에 바로 보낸 항목(휴지통 기록이 있는 항목)만 복원하고,
   * 휴지통에 보낸 폴더 안의 항목(검색 결과로 보인다)은 그 폴더와 함께 돌아가므로 따로 복원하지 않는다.
   * @codocs [[파일 탐색기:휴지통 보기]]
   * @param ids 항목 id
   * @returns 복원할 수 있는 항목 id
   */
  function getRestorableIds(ids: readonly string[]): string[] {
    return ids.filter((id) => {
      const item = items[id];
      return item !== undefined && item.trash !== null;
    });
  }

  /**
   * 항목들을 잘라낸다(붙여넣으면 옮긴다).
   * @param ids 항목 id
   */
  function cut(ids: readonly string[]): void {
    if (!isRecycleBin && ids.length > 0) {
      useItemClipboardStore.getState().cut(ids);
    }
  }

  /**
   * 잘라낸 항목을 지금 위치로 옮기고, 잘라낸 것을 비운 뒤 붙여넣은 항목을 고른다. 옮길 수 없으면 제자리다.
   * @codocs [[작업 공간:배치]]
   */
  function paste(): void {
    if (pasteIds === null || !getWorkspace().moveItems(pasteIds, location).ok) {
      return;
    }
    useItemClipboardStore.getState().clear();
    const [firstId] = pasteIds;
    selection.setSelection({
      ids: pasteIds,
      anchorId: firstId ?? null,
      focusId: firstId ?? null,
    });
  }

  /**
   * 폴더 이름 바꾸기를 시작한다. 폴더가 아니면 하지 않는다.
   * @param id 항목 id
   */
  function startRename(id: string): void {
    const item = getWorkspace().items[id];
    if (!isRecycleBin && item?.kind === 'folder') {
      selection.setSelection(selectOnly(id));
      rename.startRename(id, item.name);
    }
  }

  /**
   * 지금 위치에 새 폴더(`새 폴더`, 있으면 `새 폴더 (2)`…)를 만들고 고른다.
   * @returns 만든 폴더 id. 만들지 못하면 null
   */
  function createFolder(): string | null {
    if (isRecycleBin) {
      return null;
    }
    const result = getWorkspace().createFolder(location);
    // 새 폴더가 검색 결과에 가려지지 않게 검색을 끝낸다.
    setSearch(endSearch(location));
    if (!result.ok) {
      return null;
    }
    selection.setSelection(selectOnly(result.id));
    return result.id;
  }

  /**
   * 모바일 검색 줄을 닫는다(← 버튼, 외부 키보드의 Esc). 검색어를 지우고 원래 주소 줄로 돌아가며,
   * 사라지는 검색 상자 대신 항목 자리에 포커스를 둔다.
   * @codocs [[파일 탐색기:폴더 안 검색]]
   */
  function handleMobileSearchClose(): void {
    setSearch(endSearch(location));
    areaRef.current?.focus();
  }

  /**
   * 본문에서 누른 키를 처리한다. 모바일 검색 줄의 검색 상자에서 누른 Esc는 검색 줄을 닫고, 나머지는 이동 단축키로 넘긴다.
   * @codocs [[파일 탐색기:폴더 안 검색]]
   * @param event 키 이벤트
   */
  function handleContentKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (
      isMobileSearchOpen &&
      event.key === 'Escape' &&
      event.target instanceof HTMLInputElement &&
      event.target.getAttribute('role') === 'searchbox'
    ) {
      event.preventDefault();
      handleMobileSearchClose();
      return;
    }
    handleNavigationKeyDown?.(event);
  }

  /**
   * 시작 화면 고정을 바꾼다.
   * @param id 항목 id
   */
  function togglePin(id: string): void {
    if (startPins.includes(id)) {
      getWorkspace().unpinFromStart(id);
    } else {
      getWorkspace().pinToStart(id);
    }
  }

  /**
   * 자세히 보기의 열 제목을 누르면 그 열로 정렬한다(같은 열이면 방향을 뒤집는다).
   * @param column 누른 열
   */
  function handleColumnSort(column: ExplorerDetailsColumn): void {
    if (isSearching) {
      return;
    }
    const next = getSortAfterColumnClick(view, column);
    if (next !== undefined) {
      changeView(next);
    }
  }

  /**
   * 우클릭·길게 누르기로 메뉴가 열리거나 닫힐 때. 연 자리가 항목이면 그 항목(고른 항목 위면 고른 항목 모두)의 메뉴,
   * 빈 곳이면 선택을 지우고 빈 곳 메뉴를 연다.
   * @param isOpen 열리는지
   * @param target 연 자리의 요소
   */
  function handleMenuOpenChange(isOpen: boolean, target: Element | null): void {
    if (!isOpen) {
      setMenu(null);
      return;
    }
    const id = target?.closest(`[${ITEM_ATTRIBUTE}]`)?.getAttribute(ITEM_ATTRIBUTE) ?? null;
    if (id === null) {
      selection.setSelection(emptySelection);
      setMenu({ kind: 'empty' });
      return;
    }
    if (selectedIds.includes(id)) {
      setMenu({ kind: 'items', ids: selectedIds });
      return;
    }
    selection.setSelection(selectOnly(id));
    setMenu({ kind: 'items', ids: [id] });
  }

  /** 메뉴가 닫히고 포커스가 돌아간 뒤, 메뉴에서 고른 이름 바꾸기와 포커스 옮기기를 한다. */
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
   * 항목 자리의 빈 곳을 누르면 끄는 사각형을 시작한다(선택을 지우거나, Ctrl이면 더한다). 터치는 선택만 지운다.
   * @param event 누르기 이벤트
   */
  function handleAreaPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest(`[${ITEM_ATTRIBUTE}]`) !== null) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (event.target instanceof Element && event.target.closest('button') !== null) {
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
   * 항목 자리의 키를 처리한다. 방향키·Ctrl + A는 선택, Enter는 열기, Delete는 휴지통으로, F2는 폴더 이름 바꾸기,
   * Ctrl + X는 잘라내기, Ctrl + V는 붙여넣기다. 항목 자리나 항목이 아닌 곳(열 제목 버튼)에서 올라온 키는 받지 않는다.
   * @codocs [[파일 탐색기:조작]]
   * @param event 키 이벤트
   */
  function handleAreaKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    // 항목 자리나 항목에서 누른 키만 받는다. 자세히 보기 열 제목 버튼 같은 다른 요소의 키는 그 요소에 둔다.
    const target = event.target instanceof Element ? event.target : null;
    const isOnItem = (target?.closest(`[${ITEM_ATTRIBUTE}]`) ?? null) !== null;
    if (target !== event.currentTarget && !isOnItem) {
      return;
    }
    if (selection.handleSelectionKeyDown(event)) {
      return;
    }
    const isCommand = event.ctrlKey || event.metaKey;
    if (isCommand && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      cut(selectedIds);
      return;
    }
    if (isCommand && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      paste();
      return;
    }
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        openItems(selectedIds);
        break;
      case 'Delete': {
        event.preventDefault();
        const nextId = trash(selectedIds);
        if (nextId !== undefined) {
          focusAfterRemoval(nextId);
        }
        break;
      }
      case 'F2':
        if (onlySelected?.kind === 'folder') {
          event.preventDefault();
          startRename(onlySelected.id);
        }
        break;
      default:
        break;
    }
  }

  /**
   * 항목(FileItem·FileRow)마다 선택·열기·키보드 포커스 속성을 만든다.
   * @param item 항목
   * @returns 항목 속성
   */
  function getItemProps(item: PlacedItem): ComponentProps<'div'> & Record<string, unknown> {
    const { id } = item;
    const tabbableId = selection.selection.focusId ?? orderedIds[0];
    return {
      role: 'option',
      'aria-selected': selectedIds.includes(id),
      tabIndex: id === tabbableId ? 0 : -1,
      [ITEM_ATTRIBUTE]: id,
      [DROP_TARGET_ATTRIBUTE]: canBeDropTarget(item) ? id : undefined,
      [DROP_TARGET_NAME_ATTRIBUTE]: canBeDropTarget(item) ? item.name : undefined,
      onFocus: () => {
        setFocusedItemId(id);
      },
      onBlur: () => {
        setFocusedItemId((current) => (current === id ? null : current));
      },
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (rename.renamingId === id || event.button !== 0) {
          return;
        }
        const next = selection.handleItemPointerDown(id, event);
        event.currentTarget.focus();
        if (!isMobile && !isRecycleBin) {
          const ids = next.ids.includes(id) ? next.ids : [id];
          setDragOrigins(measureDragOrigins(ids));
          if (itemDrag.startItemDrag(event, ids)) {
            // 글자 선택과 그림의 기본 끌기가 시작되지 않게 한다. 클릭·더블클릭은 그대로 일어난다.
            event.preventDefault();
          }
        }
      },
      onClick: (event: MouseEvent<HTMLDivElement>) => {
        if (itemDrag.consumeDragEnd() || rename.renamingId === id || menu !== null) {
          return;
        }
        selection.handleItemClick(id, event);
        if (isMobile) {
          openItems([id]);
        }
      },
      onDoubleClick: () => {
        if (!isMobile && rename.renamingId !== id) {
          openItems([id]);
        }
      },
    };
  }

  /**
   * 열린 메뉴의 항목을 만든다.
   * @param openMenu 열린 메뉴
   * @returns 메뉴 항목
   */
  function getMenuEntries(openMenu: OpenMenu): MenuPopupEntry[] {
    if (openMenu.kind === 'empty') {
      return getEmptyMenuEntries({
        ...viewMenuOptions,
        isRecycleBin,
        canPaste,
        onPaste: paste,
        onNewFolder: () => {
          setPendingRenameId(createFolder());
        },
        isRecycleBinEmpty,
        onRefresh: () => {
          setIsRefreshing(true);
        },
        onEmptyRecycleBin: () => {
          setIsEmptyDialogOpen(true);
        },
      });
    }
    const { ids } = openMenu;
    const [firstId] = ids;
    const first = ids.length === 1 && firstId !== undefined ? items[firstId] : undefined;
    return getItemMenuEntries({
      kind: ids.length === 1 ? (first?.kind ?? null) : null,
      isInRecycleBin: isRecycleBin,
      isMobile,
      isPinned: firstId !== undefined && startPins.includes(firstId),
      canTrash: trashItems(getWorkspace(), ids, new Date().toISOString()).ok,
      onOpen: () => {
        openItems(ids);
      },
      onOpenInNewTab: () => {
        if (firstId !== undefined) {
          onOpenInNewTab(firstId);
        }
      },
      onOpenInNewWindow: () => {
        openItems(ids, true);
      },
      onCopyLink: () => {
        if (first !== undefined) {
          copyItemLink(first);
        }
      },
      onTogglePin: () => {
        if (firstId !== undefined) {
          togglePin(firstId);
        }
      },
      onCut: () => {
        cut(ids);
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
      onRestore: () => {
        restore(ids);
      },
    });
  }

  const viewMenuOptions = {
    view,
    onViewChange: (next: ExplorerFolderView['view']) => {
      changeView({ view: next });
      setMenu(null);
    },
    onSortByChange: (sortBy: ExplorerFolderView['sortBy']) => {
      changeView({ sortBy });
      setMenu(null);
    },
    onSortDirectionChange: (sortDirection: ExplorerFolderView['sortDirection']) => {
      changeView({ sortDirection });
      setMenu(null);
    },
  };
  const menuEntries = menu === null ? [] : getMenuEntries(menu);
  const visibleItems = isRefreshing ? [] : children;
  const isDetails = view.view === 'details' || isSearching;

  /**
   * 항목 하나를 지금 보기로 그린다.
   * @param item 항목
   * @returns FileItem이나 FileRow
   */
  function renderItem(item: PlacedItem): ReactNode {
    const element = renderItemElement(item);
    if (rename.renamingId !== item.id) {
      return element;
    }
    // 이름을 바꾸는 항목은 말풍선을 그 바로 아래에 띄우도록 위치 기준 상자로 감싼다.
    return (
      <div key={item.id} className={isDetails ? 'relative w-full' : 'relative'}>
        {element}
        {rename.errorMessage !== null && (
          <Tooltip
            type="balloon"
            message={rename.errorMessage}
            className="absolute left-0 z-1"
            style={{ top: `calc(100% + ${String(BALLOON_OFFSET)}px)` }}
          />
        )}
      </div>
    );
  }

  /**
   * 항목 하나를 지금 보기의 항목 요소로 그린다.
   * @param item 항목
   * @returns FileItem이나 FileRow
   */
  function renderItemElement(item: PlacedItem): ReactNode {
    const isSelected = selectedIds.includes(item.id);
    const isRenaming = rename.renamingId === item.id;
    const common = {
      ...getItemProps(item),
      name: item.name,
      selected: isSelected || item.id === dragTargetId,
      focused: isSelected && focusedItemId === item.id,
      cut: cutSet.has(item.id),
      renaming: isRenaming,
      renameFieldProps: isRenaming ? rename.renameFieldProps : undefined,
    };
    if (!isDetails) {
      return (
        <FileItem
          key={item.id}
          {...common}
          surface="explorer"
          view={ICON_VIEWS[view.view === 'large' ? 'large' : 'medium']}
          icon={renderItemIcon(item)}
        />
      );
    }
    if (isSearching) {
      return (
        <FileRow
          key={item.id}
          {...common}
          date={formatModifiedDate(item.date)}
          type={getItemTypeLabel(item.kind)}
          showLocation
          location={getItemLocationLabel(workspace, item.parentId)}
          icon={renderItemIcon(item)}
          className="w-full"
        />
      );
    }
    if (isRecycleBin) {
      return (
        <FileRow
          key={item.id}
          {...common}
          view="recycle-bin"
          originalLocation={getOriginalLocation(workspace, item)}
          deletedDate={formatDeletedDate(item.trash?.deletedAt ?? '')}
          icon={renderItemIcon(item)}
          className="w-full"
        />
      );
    }
    return (
      <FileRow
        key={item.id}
        {...common}
        date={formatModifiedDate(item.date)}
        type={getItemTypeLabel(item.kind)}
        icon={renderItemIcon(item)}
        className="w-full"
      />
    );
  }

  const listItems = visibleItems.map(renderItem);
  const drag = itemDrag.drag;

  /**
   * 끄는 항목 하나를 끄는 복제본으로 바꾼다. 끌기를 시작할 때 잰 화면 자리에서 시작한다.
   * @param id 끄는 항목 id
   * @returns 복제본. 항목이나 자리가 없으면 빈 목록
   */
  function toGhostItem(id: string): ItemDragGhostItem[] {
    const item = items[id];
    const origin = dragOrigins[id];
    return item === undefined || item.kind === 'recycle-bin' || origin === undefined
      ? []
      : [{ id, name: item.name, icon: renderItemIcon(item), origin }];
  }
  const overlay = (
    <>
      {drag !== null && (
        <ItemDragGhost
          items={drag.ids.flatMap(toGhostItem)}
          surface="explorer"
          view={view.view === 'large' ? 'large' : 'medium'}
          delta={drag.delta}
          pointer={drag.pointer}
          targetName={drag.target?.name ?? null}
        />
      )}
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
    </>
  );
  const commandHandlers = isRecycleBin
    ? {
        onRestore: () => {
          restore(selectedIds);
        },
        onEmptyRecycleBin: () => {
          setIsEmptyDialogOpen(true);
        },
      }
    : {
        onNew: () => {
          const id = createFolder();
          if (id !== null) {
            startRename(id);
          }
        },
        onCut: () => {
          cut(selectedIds);
        },
        onPaste: paste,
        onRename: () => {
          if (onlySelected?.kind === 'folder') {
            startRename(onlySelected.id);
          }
        },
        onDelete: () => {
          const nextId = trash(selectedIds);
          if (nextId !== undefined) {
            focusAfterRemoval(nextId);
          }
        },
      };
  const disabledCommands = isRecycleBin
    ? [
        ...(getRestorableIds(selectedIds).length === 0 ? (['onRestore'] as const) : []),
        ...(isRecycleBinEmpty ? (['onEmptyRecycleBin'] as const) : []),
        'onView' as const,
      ]
    : [
        ...(selectedIds.length === 0 ? (['onCut'] as const) : []),
        ...(canPaste ? [] : (['onPaste'] as const)),
        ...(onlySelected?.kind === 'folder' ? [] : (['onRename'] as const)),
        ...(canTrash ? [] : (['onDelete'] as const)),
      ];

  /**
   * 상태 줄의 보기 버튼으로 보기를 바꾼다. 휴지통은 늘 자세히 보기다.
   * @param next 보기
   */
  function changeIconView(next: ExplorerFolderView['view']): void {
    if (!isRecycleBin) {
      changeView({ view: next });
    }
  }

  /**
   * 휴지통 비우기 메시지 상자가 닫히면(확인, Esc) 닫힌 상태로 둔다.
   * @param isOpen 열림 여부
   */
  function handleEmptyDialogOpenChange(isOpen: boolean): void {
    setIsEmptyDialogOpen(isOpen);
  }

  /**
   * 항목 자리를 우클릭(모바일은 길게 누르기) 메뉴 영역으로 감싼다.
   * @param area 항목 자리 요소
   * @returns 메뉴 영역
   */
  function renderItemsArea(area: ReactElement): ReactNode {
    return (
      <ContextMenuArea
        open={menu !== null}
        onOpenChange={handleMenuOpenChange}
        onCloseComplete={handleMenuCloseComplete}
        items={menuEntries}
        area={area}
      />
    );
  }

  return (
    <>
      <ExplorerContent
        {...contentProps}
        device={device}
        className="min-h-0 w-full flex-1"
        // 같은 탭에서 위치를 옮기면 항목 자리를 새로 그려 스크롤을 맨 위로 돌린다.
        itemsKey={location ?? DESKTOP_LOCATION_KEY}
        onRefresh={() => {
          setIsRefreshing(true);
        }}
        onKeyDown={handleContentKeyDown}
        searchValue={query}
        onSearchChange={(value: string) => {
          setSearch({ location, query: value, isOpen: isMobileSearchOpen });
        }}
        search={isMobileSearchOpen ? 'open' : 'closed'}
        onSearch={() => {
          setSearch({ location, query: '', isOpen: true });
        }}
        onSearchClose={handleMobileSearchClose}
        dropTarget={{
          id: location ?? DESKTOP_DROP_TARGET,
          name: getExplorerLocationName(workspace, location),
        }}
        commands={
          <ExplorerCommands
            device={device}
            location={isRecycleBin ? 'recycle-bin' : 'folder'}
            disabledCommands={disabledCommands}
            sortMenu={(isRecycleBin ? getRecycleBinSortMenuEntries : getSortMenuEntries)(
              viewMenuOptions,
            )}
            viewMenu={getViewMenuEntries(viewMenuOptions)}
            {...commandHandlers}
          />
        }
        itemCount={`항목 ${String(children.length)}개`}
        selection={`${String(selectedIds.length)}개 항목 선택함`}
        showSelection={selectedIds.length > 0}
        onDetailsView={() => {
          changeIconView('details');
        }}
        onLargeIconsView={() => {
          changeIconView('large');
        }}
        itemsAreaProps={{
          ref: areaRef,
          role: 'listbox',
          'aria-label': '폴더 내용',
          'aria-multiselectable': !isMobile,
          tabIndex: -1,
          className: 'outline-none',
          onPointerDown: handleAreaPointerDown,
          onKeyDown: handleAreaKeyDown,
          onDragStart: handleNativeDragStart,
        }}
        renderItemsArea={renderItemsArea}
      >
        {isDetails ? (
          <div className="flex w-full flex-col items-start">
            <DetailsHeader
              view={isRecycleBin && !isSearching ? 'recycle-bin' : 'default'}
              showLocation={isSearching}
              sortColumn={getSortColumn(view.sortBy, isRecycleBin && !isSearching)}
              sortDirection={view.sortDirection === 'desc' ? 'descending' : 'ascending'}
              onSort={handleColumnSort}
            />
            {listItems}
          </div>
        ) : (
          listItems
        )}
        {overlay}
      </ExplorerContent>
      <MessageBoxDialog
        {...EMPTY_RECYCLE_BIN_MESSAGE}
        open={isEmptyDialogOpen}
        onOpenChange={handleEmptyDialogOpenChange}
      />
      <MessageBoxDialog {...rename.messageBoxProps} />
    </>
  );
}

/**
 * 검색을 끝낸 상태. 검색어를 지우고 모바일 검색 줄을 닫는다.
 * @codocs [[파일 탐색기:폴더 안 검색]]
 * @param location 보고 있는 위치
 * @returns 검색 상태
 */
function endSearch(location: ExplorerLocation): ExplorerSearchState {
  return { location, query: '', isOpen: false };
}

/**
 * 항목 요소의 자리를 항목 자리(끄는 사각형과 같은 기준) 왼쪽 위 기준으로 잰다. 화면 위 자리의 차이로 재므로,
 * 이름 바꾸기 말풍선을 위해 감싼 상자처럼 항목과 항목 자리 사이에 위치 기준 상자가 끼어도 같은 기준이다.
 * @param element 항목 요소
 * @param area 항목 자리 요소
 * @returns 항목 자리 기준 사각형
 */
function getRectInArea(element: HTMLElement, area: HTMLElement | null): SelectionRect {
  const rect = element.getBoundingClientRect();
  const origin = area?.getBoundingClientRect() ?? { left: 0, top: 0 };
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 항목 종류에 맞는 아이콘(file/Folder, file/Document, 외부 링크 설정의 아이콘).
 * @param item 항목
 * @returns 아이콘
 */
function renderItemIcon(item: WorkspaceItem): ReactNode {
  switch (item.kind) {
    case 'folder':
      return <ImageAsset name="images/file-folder" className="size-full object-contain" />;
    case 'post':
      return <ImageAsset name="images/file-document" className="size-full object-contain" />;
    case 'link':
      return <Asset name={item.icon} className="size-full" />;
    case 'recycle-bin':
      return (
        <ImageAsset name="images/file-recycle-bin-empty" className="size-full object-contain" />
      );
  }
}

/**
 * 그림·글자의 브라우저 기본 끌기(drag and drop)를 막는다.
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
