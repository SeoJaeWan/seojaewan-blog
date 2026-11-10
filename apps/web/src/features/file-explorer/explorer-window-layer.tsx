import {
  type JSX,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Asset, BreadcrumbItem, ImageAsset, NavigationItem } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import {
  DESKTOP_DROP_TARGET,
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
  FAVORITES_INDEX_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';
import { useItemDragStore } from '@/shared/stores/item-drag-store/item-drag-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type {
  ExplorerLocation,
  ExplorerSelection,
  ExplorerWindowContent,
  WindowFrameControls,
} from '@/shared/utils/window-rules/window-rules';
import {
  DEFAULT_EXPLORER_VIEW,
  DESKTOP_LOCATION_KEY,
  getFavoriteFolders,
} from '@/shared/utils/workspace-rules/workspace-rules';

import {
  type BreadcrumbMenuTarget,
  getBreadcrumbMenuEntries,
  getSubfolderTargets,
} from './breadcrumb-menu/breadcrumb-menu-entries';
import { ExplorerBody } from './components/explorer-body/explorer-body';
import { ExplorerWindow } from './components/explorer-window/explorer-window';
import { NavigationFavorites } from './components/navigation-favorites/navigation-favorites';
import {
  DESKTOP_LOCATION_ICON,
  type ExplorerWorkspace,
  getExplorerLocationIcon,
  getExplorerLocationName,
  getExplorerLocationTrail,
} from './utils/explorer-location/explorer-location';
import {
  canGoBack,
  canGoForward,
  closeTab,
  getActiveTab,
  getCurrentLocation,
  getFavoriteRows,
  getFocusableTreeKey,
  getNavigationRows,
  getParentLocation,
  getTabLocation,
  getTabSelection,
  getTreeMoveTarget,
  goBack,
  goForward,
  goUp,
  mergeNavigationRows,
  moveTab,
  navigateTo,
  type NavigationRow,
  openNewTab,
  type OrderFolders,
  resolveExplorerContent,
  saveActiveSelection,
  selectTab,
  setTreeNodeExpanded,
} from './utils/explorer-navigation/explorer-navigation';
import { sortExplorerItems } from './utils/explorer-sort/explorer-sort';

type ExplorerWindowLayerProps = {
  windowId: string;
  content: ExplorerWindowContent;
  controls: WindowFrameControls;
  device: DeviceVariant;
};

// 맨 앞 위치 아이콘 뒤 꺾쇠의 열쇠다. 마디 뒤 꺾쇠는 마디 차례를 열쇠로 쓴다.
const ROOT_SEPARATOR_KEY = 'root';

// 탐색 창 칸마다 다는 트리 칸 열쇠 속성. 방향키로 옮겨 갈 칸을 찾는다(즐겨찾기 칸과 트리 칸은 같은 폴더라도 열쇠가 다르다).
const TREE_KEY_ATTRIBUTE = 'data-tree-key';

/**
 * 탐색기 창 하나를 작업 공간 저장소와 창 저장소에 잇는 층이다. 창 내용(탭과 위치 기록)은 창 저장소에 두어,
 * 작업 표시줄 미리보기나 Snap Assist가 창을 다시 그려도 같은 모습이다.
 * 고른 탭이 보는 위치의 이름(탭, 검색 안내 글자), 위치 칸, 탐색 창(즐겨찾기와 폴더 트리), 항목, 항목 개수를 그리고,
 * 폴더 열기·위치 칸·탐색 창·뒤로·앞으로·위로·Backspace·Alt + ← / →로 같은 탭에서 위치를 옮긴다.
 * 위치를 떠날 때 본문의 지금 선택을 그 기록 칸에 적어, 뒤로·앞으로로 돌아오면 되살린다. 위로 간 칸은 방금 있던 폴더를 고른다.
 * 항목과 항목 조작은 본문(`ExplorerBody`)이 맡는다. 탐색 창의 하위 폴더는 그 위치에 기억한 정렬을 따른다.
 * 위치 칸의 꺾쇠는 목록 버튼이다. 마디 뒤 꺾쇠는 그 위치의 하위 폴더, 맨 앞 꺾쇠는 탐색 창의 최상위 칸을 보이고, 고르면 같은 탭에서 간다.
 * 탭·위치 칸·탐색 창·꺾쇠 목록의 위치 아이콘은 한 함수(`getExplorerLocationIcon`)로 고른다.
 * 모바일은 탭 하나만 쓴다(탭 줄이 없다).
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[파일 탐색기:탐색 창]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @codocs [[창 동작:모바일]]
 * @codocs [[파일 탐색기:모바일]]
 * @param props 컴포넌트 속성
 * @param props.windowId 창 id. 창 내용(탭과 위치 기록)을 바꿀 때 쓴다
 * @param props.content 창 내용(탭, 탭마다의 위치 기록, 탐색 창 펼침)
 * @param props.controls 창 층이 넘기는 창 동작 속성
 * @param props.device 화면 방식
 */
export function ExplorerWindowLayer({
  windowId,
  content,
  controls,
  device,
}: ExplorerWindowLayerProps): JSX.Element {
  const items = useWorkspaceStore((state) => state.items);
  const favoritePins = useWorkspaceStore((state) => state.favoritePins);
  const setContent = useWindowStore((state) => state.setContent);
  const workspace = { items };
  const location = getCurrentLocation(content);
  const explorerViews = useWorkspaceStore((state) => state.explorerViews);
  const dragTargetId = useItemDragStore((state) => state.targetId);
  const favoritesDrop = useItemDragStore((state) => state.favoritesDrop);
  // 본문의 지금 선택. 위치를 떠날 때 그 기록 칸에 적는다. 그릴 때 쓰지 않아 상태로 두지 않는다.
  const selectionRef = useRef<ExplorerSelection | undefined>(undefined);
  // 즐겨찾기 칸을 눌러 간 폴더. 그 폴더를 보는 동안 즐겨찾기 칸이 선택된 칸이다. 다른 방법으로 가면 지운다.
  const [pickedFavoriteId, setPickedFavoriteId] = useState<string | null>(null);
  // 탐색 창에서 키보드 포커스가 머문 칸(현재 칸)과 그때의 위치. 위치가 바뀌면 고른 칸으로 돌아간다.
  const [treeCurrent, setTreeCurrent] = useState<{
    location: ExplorerLocation;
    key: string;
  } | null>(null);
  // 열린 경로 꺾쇠 목록. key는 꺾쇠 자리(맨 앞이면 `root`, 마디 뒤면 마디 차례)이고 location은 열 때의 위치다. 위치가 바뀌면 닫힌다.
  const [openSeparator, setOpenSeparator] = useState<{
    location: ExplorerLocation;
    key: string;
  } | null>(null);
  const isDesktop = device === 'desktop';
  const locationName = getExplorerLocationName(workspace, location);
  const trail = getExplorerLocationTrail(workspace, location);
  const visibleTrail = isDesktop ? trail : trail.slice(-1);
  const activeTab = getActiveTab(content);
  const favoriteRows = getFavoriteRows(
    getFavoriteFolders({ items, favoritePins }),
    location,
    pickedFavoriteId,
  );
  const navigationRows = mergeNavigationRows(
    getNavigationRows(content, workspace, orderFolders),
    favoriteRows,
  );
  const treeRows = navigationRows.slice(favoriteRows.length);
  const focusableTreeKey = getFocusableTreeKey(navigationRows, content, workspace);
  const currentTreeKey =
    treeCurrent !== null &&
    treeCurrent.location === location &&
    navigationRows.some((row) => row.key === treeCurrent.key)
      ? treeCurrent.key
      : focusableTreeKey;
  const dropSlot =
    favoritesDrop?.isAllowed === true && favoritesDrop.areaId === windowId
      ? favoritesDrop.slot
      : null;

  useEffect(
    /**
     * 다른 창에서 이 창의 탭이 보는 폴더를 휴지통에 넣으면, 그 탭을 상위 폴더로 옮긴다.
     * @codocs [[파일 탐색기:탭]]
     */
    () => {
      const resolved = resolveExplorerContent(content, { items });
      if (resolved !== content) {
        setContent(windowId, resolved);
      }
    },
    [content, items, setContent, windowId],
  );

  /**
   * 탐색 창의 하위 폴더를 그 위치(상위 폴더, 바탕화면)에 기억한 정렬로 늘어놓는다.
   * @param parentId 위치
   * @param nodes 하위 폴더
   * @returns 정렬한 하위 폴더
   */
  function orderFolders(
    parentId: Parameters<OrderFolders>[0],
    nodes: Parameters<OrderFolders>[1],
  ): ReturnType<OrderFolders> {
    const view = explorerViews[parentId ?? DESKTOP_LOCATION_KEY] ?? DEFAULT_EXPLORER_VIEW;
    const sorted = sortExplorerItems(
      nodes.map((node) => node.folder),
      view,
      workspace,
    );
    return sorted.flatMap((folder) => nodes.filter((node) => node.folder === folder));
  }

  /**
   * 경로 꺾쇠의 목록이 열려 있는지.
   * @param key 꺾쇠 자리
   * @returns 열려 있으면 true
   */
  function isSeparatorOpen(key: string): boolean {
    return openSeparator?.location === location && openSeparator.key === key;
  }

  /**
   * 경로 꺾쇠를 목록 버튼(MenuButton)으로 감싸는 함수를 만든다. 목록에서 고르면 같은 탭에서 그 위치로 간다(기록에 남는다).
   * 열린 동안 꺾쇠는 아래 꺾쇠(⌄)다. 모바일은 경로를 한 칸으로만 보이므로 목록이 없다.
   * @codocs [[파일 탐색기:구성]]
   * @codocs [[파일 탐색기:모바일]]
   * @param key 꺾쇠 자리
   * @param targets 목록에 보일 위치
   * @returns 꺾쇠를 감싸는 함수. 모바일이면 undefined
   */
  function getSeparatorMenu(
    key: string,
    targets: readonly BreadcrumbMenuTarget[],
  ): ((separator: ReactElement) => ReactNode) | undefined {
    if (!isDesktop) {
      return undefined;
    }
    return (separator) => (
      <BreadcrumbSeparatorMenu
        separator={separator}
        targets={targets}
        isOpen={isSeparatorOpen(key)}
        onOpenChange={(isOpen: boolean) => {
          setOpenSeparator(isOpen ? { location, key } : null);
        }}
        onNavigate={handleNavigate}
      />
    );
  }

  /**
   * 마디 위치의 하위 폴더. 그 위치에 기억한 정렬로 늘어놓는다.
   * @param target 마디 위치
   * @returns 하위 폴더
   */
  function getSubfolders(target: ExplorerLocation): BreadcrumbMenuTarget[] {
    return getSubfolderTargets(
      workspace,
      target,
      explorerViews[target ?? DESKTOP_LOCATION_KEY] ?? DEFAULT_EXPLORER_VIEW,
    );
  }

  /**
   * 탐색 창 최상위 칸을 꺾쇠 목록 줄로 바꾼다.
   * @param row 최상위 칸
   * @returns 목록 줄
   */
  function toRootTarget(row: NavigationRow): BreadcrumbMenuTarget {
    return {
      location: row.location,
      name: row.label,
      icon: getExplorerLocationIcon(workspace, row.location),
    };
  }

  // 맨 앞 위치 아이콘 뒤 꺾쇠의 목록은 탐색 창의 최상위 칸(바탕 화면, 휴지통)이다.
  const rootTargets = treeRows.filter((row) => row.level === 0).map(toRootTarget);

  /**
   * 창 내용을 바꾼다.
   * @param next 새 창 내용
   */
  function update(next: ExplorerWindowContent): void {
    setContent(windowId, next);
  }

  /**
   * 본문의 지금 선택을 받아 둔다.
   * @param selection 지금 선택
   */
  function handleSelectionChange(selection: ExplorerSelection): void {
    selectionRef.current = selection;
  }

  /**
   * 고른 탭에서 위치로 간다. 같은 동작 안에서 작업 공간을 바꾼 뒤 갈 수 있으므로(주소창에서 휴지통 폴더를 복원하고 그 폴더로 가기)
   * 그린 때의 배치가 아니라 저장소의 지금 배치로 위치를 확인한다.
   * @param target 갈 위치
   */
  function handleNavigate(target: ExplorerLocation): void {
    setPickedFavoriteId(null);
    update(
      navigateTo(
        content,
        { items: useWorkspaceStore.getState().items },
        target,
        selectionRef.current,
      ),
    );
  }

  /**
   * 탐색 창 칸을 눌러 그 위치로 간다. 즐겨찾기 칸이면 그 칸을 선택된 칸으로 보인다.
   * @codocs [[파일 탐색기:탐색 창]]
   * @param row 누른 칸
   */
  function handleRowNavigate(row: NavigationRow): void {
    handleNavigate(row.location);
    if (favoriteRows.some((favorite) => favorite.key === row.key)) {
      setPickedFavoriteId(row.location);
    }
  }

  /** 뒤로 간다. */
  function handleBack(): void {
    setPickedFavoriteId(null);
    update(goBack(content, workspace, selectionRef.current));
  }

  /** 앞으로 간다. */
  function handleForward(): void {
    setPickedFavoriteId(null);
    update(goForward(content, workspace, selectionRef.current));
  }

  /** 상위 위치로 간다. */
  function handleUp(): void {
    setPickedFavoriteId(null);
    update(goUp(content, workspace, selectionRef.current));
  }

  /**
   * 탭을 고른다. 떠나는 탭의 지금 선택은 그 기록 칸에 적어 돌아오면 되살린다.
   * @param index 탭 차례
   */
  function handleTabSelect(index: number): void {
    if (index === content.activeTabIndex) {
      return;
    }
    setPickedFavoriteId(null);
    update(selectTab(saveActiveSelection(content, selectionRef.current), workspace, index));
  }

  /**
   * 탭을 닫는다. 마지막 탭이면 창을 닫는다.
   * @param index 탭 차례
   */
  function handleTabClose(index: number): void {
    const next = closeTab(content, workspace, index);
    if (next === null) {
      controls.onClose();
      return;
    }
    update(next);
  }

  /**
   * 폴더를 새 탭에서 열고 그 탭을 고른다(우클릭 메뉴의 새 탭에서 열기).
   * @codocs [[파일 탐색기:우클릭 메뉴]]
   * @param target 열 폴더
   */
  function handleOpenInNewTab(target: ExplorerLocation): void {
    setPickedFavoriteId(null);
    update(openNewTab(saveActiveSelection(content, selectionRef.current), workspace, target));
  }

  /**
   * 탭을 끌어 다른 자리로 옮긴다.
   * @param from 옮길 탭의 차례
   * @param to 옮길 자리
   */
  function handleTabMove(from: number, to: number): void {
    // 끄는 동안 여러 번 옮기므로, 그린 때의 내용이 아니라 저장소의 지금 내용에서 옮긴다.
    const latest = useWindowStore.getState().windows[windowId]?.content;
    if (latest?.app === 'file-explorer') {
      update(moveTab(latest, from, to));
    }
  }

  /** 새 탭(+)을 "바탕 화면" 위치로 연다. */
  function handleNewTab(): void {
    setPickedFavoriteId(null);
    update(openNewTab(saveActiveSelection(content, selectionRef.current), workspace));
  }

  /**
   * 탐색 창 트리 칸을 펼치거나 접는다.
   * @param row 트리 칸
   * @param isExpanded 펼칠지
   */
  function handleTreeToggle(row: NavigationRow, isExpanded: boolean): void {
    update(setTreeNodeExpanded(content, row.key, isExpanded));
  }

  /**
   * 탐색 창 칸에 포커스가 오면 그 칸을 현재 칸으로 둔다.
   * @param row 포커스가 온 칸
   */
  function handleRowFocus(row: NavigationRow): void {
    setTreeCurrent({ location, key: row.key });
  }

  /**
   * 본문의 이동 단축키를 받는다. Backspace와 Alt + ←는 뒤로, Alt + →는 앞으로다. 입력칸에서 누른 Backspace는 글자를 지운다.
   * @codocs [[파일 탐색기:조작]]
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    // 포털로 그린 메뉴(우클릭·정렬·보기)의 키도 React 트리로 올라오므로, 본문 DOM 안에서 누른 키만 받는다.
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) {
      return;
    }
    const isTyping =
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable || event.target.closest('input, textarea') !== null);
    if (event.key === 'Backspace' && !isTyping && !event.altKey) {
      event.preventDefault();
      handleBack();
    } else if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      handleBack();
    } else if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      handleForward();
    }
  }

  /**
   * 탐색 창 칸 하나를 그린다.
   * @param row 칸
   * @param favoriteIndex 즐겨찾기 칸이면 그 차례. 트리 칸이면 undefined
   * @returns 칸
   */
  function renderRow(row: NavigationRow, favoriteIndex?: number): ReactNode {
    return (
      <NavigationTreeItem
        key={row.key}
        row={row}
        rows={navigationRows}
        isFocusable={row.key === currentTreeKey}
        isCurrent={row.key === currentTreeKey}
        isDropTarget={(row.location ?? DESKTOP_DROP_TARGET) === dragTargetId}
        favoriteIndex={favoriteIndex}
        icon={renderLocationIcon(workspace, row.location)}
        onNavigate={handleRowNavigate}
        onToggle={handleTreeToggle}
        onFocus={handleRowFocus}
      />
    );
  }

  return (
    <ExplorerWindow
      {...controls}
      device={device}
      tabs={content.tabs.map(
        /**
         * 탭 하나의 제목(보는 위치 이름)과 아이콘을 정한다.
         * @param tab 탭
         * @param index 차례
         * @returns 탐색기 창 탭
         */
        (tab, index) => {
          const tabLocation = getTabLocation(tab);
          return {
            id: tab.id,
            title: getExplorerLocationName(workspace, tabLocation),
            isSelected: index === content.activeTabIndex,
            icon: renderLocationIcon(workspace, tabLocation),
          };
        },
      )}
      onTabSelect={handleTabSelect}
      onTabClose={handleTabClose}
      onNewTab={handleNewTab}
      onTabMove={handleTabMove}
    >
      <ExplorerBody
        // 탭마다 본문을 따로 그려, 탭을 바꾸면 선택·스크롤 같은 본문 상태가 새로 시작한다.
        key={activeTab.id}
        device={device}
        location={location}
        selectionKey={`${String(activeTab.historyIndex)}:${location ?? DESKTOP_LOCATION_KEY}`}
        restoredSelection={getTabSelection(activeTab)}
        onSelectionChange={handleSelectionChange}
        onNavigate={handleNavigate}
        onOpenInNewTab={handleOpenInNewTab}
        locationIcon={renderLocationIcon(workspace, location)}
        isBreadcrumbSeparatorOpen={isSeparatorOpen(ROOT_SEPARATOR_KEY)}
        renderBreadcrumbSeparator={getSeparatorMenu(ROOT_SEPARATOR_KEY, rootTargets)}
        searchPlaceholder={`${locationName} 검색`}
        path={visibleTrail.map(
          /**
           * 위치 칸 하나를 그린다. 마지막 칸이 현재 위치이고, 누르면 그 위치로 간다.
           * 뒤의 꺾쇠는 그 위치의 하위 폴더 목록을 연다. 마지막 칸 뒤 꺾쇠는 하위 폴더가 있을 때만 그린다(데스크톱).
           * @codocs [[파일 탐색기:구성]]
           * @param entry 위치와 이름
           * @param index 차례
           * @returns BreadcrumbItem
           */
          (entry, index) => {
            const isCurrent = index === visibleTrail.length - 1;
            const separatorKey = String(index);
            const subfolders = isDesktop ? getSubfolders(entry.location) : [];
            return (
              <BreadcrumbItem
                // 위치 이름은 겹칠 수 있어(다른 위치의 같은 이름 폴더) 차례를 함께 쓴다.
                key={`${String(index)}-${entry.location ?? 'desktop'}`}
                label={entry.name}
                isCurrent={isCurrent}
                hasSeparator={!isCurrent || subfolders.length > 0}
                isSeparatorOpen={isSeparatorOpen(separatorKey)}
                renderSeparator={getSeparatorMenu(separatorKey, subfolders)}
                onLabelClick={() => {
                  handleNavigate(entry.location);
                }}
                className="shrink-shrink-none"
              />
            );
          },
        )}
        navigation={
          <>
            <NavigationFavorites
              areaId={windowId}
              items={favoriteRows.map((row, index) => ({
                key: row.key,
                item: renderRow(row, index),
              }))}
              dropSlot={dropSlot}
            />
            {treeRows.map((row) => renderRow(row))}
          </>
        }
        canGoBack={canGoBack(content)}
        canGoForward={canGoForward(content)}
        canGoUp={getParentLocation(workspace, location) !== undefined}
        onBack={handleBack}
        onForward={handleForward}
        onUp={handleUp}
        onKeyDown={handleKeyDown}
      />
    </ExplorerWindow>
  );
}

type BreadcrumbSeparatorMenuProps = {
  separator: ReactElement;
  targets: readonly BreadcrumbMenuTarget[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onNavigate: (location: ExplorerLocation) => void;
};

/**
 * 경로 꺾쇠와 그 꺾쇠가 여는 목록(피그마 Explorer/BreadcrumbMenu). 꺾쇠를 목록 버튼(MenuButton)의 트리거로 쓰고,
 * 목록은 꺾쇠 왼쪽 끝에 맞춰 아래에 연다.
 * @codocs [[파일 탐색기:구성]]
 * @param props 컴포넌트 속성
 * @param props.separator 꺾쇠 버튼(BreadcrumbChevron)
 * @param props.targets 목록에 보일 위치
 * @param props.isOpen 목록이 열려 있는지
 * @param props.onOpenChange 목록을 열거나 닫으려 할 때
 * @param props.onNavigate 목록에서 고른 위치로 같은 탭에서 간다
 */
function BreadcrumbSeparatorMenu({
  separator,
  targets,
  isOpen,
  onOpenChange: handleOpenChange,
  onNavigate,
}: BreadcrumbSeparatorMenuProps): JSX.Element {
  return (
    <MenuButton
      trigger={separator}
      items={getBreadcrumbMenuEntries(targets, onNavigate)}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
    />
  );
}

type NavigationTreeItemProps = {
  row: NavigationRow;
  rows: readonly NavigationRow[];
  isDropTarget: boolean;
  isFocusable: boolean;
  isCurrent: boolean;
  favoriteIndex?: number;
  icon: ReactNode;
  onNavigate: (row: NavigationRow) => void;
  onToggle: (row: NavigationRow, isExpanded: boolean) => void;
  onFocus: (row: NavigationRow) => void;
};

/**
 * 탐색 창 칸 하나(즐겨찾기 칸이나 트리 칸). 클릭·Enter·Space로 그 위치로 가고, 꺾쇠·→·←로 펼치거나 접는다.
 * ↑↓는 보이는 앞뒤 칸, Home/End는 처음·끝 칸, →는 펼친 칸의 첫 자식, ←는 펼치지 않은 칸의 부모로 포커스만 옮긴다.
 * 현재 칸(키보드 포커스가 머무는 칸, 처음에는 고른 칸)만 Tab으로 닿고 1px 선을 그린다. 즐겨찾기 칸은 오른쪽에 압정을 늘 보인다.
 * 항목을 끌어 놓을 곳이기도 하다. 즐겨찾기 칸의 위·아래 끝은 즐겨찾기 놓을 자리다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:탐색 창]]
 * @codocs [[접근성:Tab]]
 * @param props 컴포넌트 속성
 * @param props.row 칸
 * @param props.rows 보이는 칸 전체. 방향키로 옮겨 갈 칸을 찾는다
 * @param props.isFocusable Tab으로 닿는 칸인지
 * @param props.isCurrent 현재 칸인지. 1px 선을 그린다
 * @param props.isDropTarget 끄는 항목을 이 칸에 놓으려는 중인지. 강조한다
 * @param props.favoriteIndex 즐겨찾기 칸이면 보이는 즐겨찾기에서의 차례. 압정을 그리고 놓을 자리를 단다
 * @param props.icon 칸 아이콘
 * @param props.onNavigate 칸을 눌렀을 때 그 위치로 간다
 * @param props.onToggle 꺾쇠나 → / ← 키로 펼치거나 접을 때
 * @param props.onFocus 칸에 포커스가 올 때
 */
function NavigationTreeItem({
  row,
  rows,
  isFocusable,
  isCurrent,
  isDropTarget,
  favoriteIndex,
  icon,
  onNavigate,
  onToggle,
  onFocus,
}: NavigationTreeItemProps): JSX.Element {
  /**
   * 칸에서 키를 눌렀을 때 이동하거나 펼치고 접는다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(row);
    } else if (event.key === 'ArrowRight' && row.expand === 'collapsed') {
      event.preventDefault();
      onToggle(row, true);
    } else if (event.key === 'ArrowLeft' && row.expand === 'expanded') {
      event.preventDefault();
      onToggle(row, false);
    } else {
      moveFocus(event);
    }
  }

  /**
   * 누른 키가 다른 칸으로 옮기는 키면 그 칸에 포커스를 옮긴다.
   * @param event 키 이벤트
   */
  function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
    const targetKey = getTreeMoveTarget(rows, row.key, event.key);
    if (targetKey === null) {
      return;
    }
    event.preventDefault();
    const target = [
      ...(event.currentTarget.closest('[role="tree"]')?.querySelectorAll('[role="treeitem"]') ??
        []),
    ].find((item) => item.getAttribute(TREE_KEY_ATTRIBUTE) === targetKey);
    if (target instanceof HTMLElement) {
      target.focus();
    }
  }

  const isFavorite = favoriteIndex !== undefined;
  return (
    <NavigationItem
      level={row.level}
      expand={row.expand}
      isSelected={row.isSelected || isDropTarget}
      isCurrent={isCurrent}
      hasPin={isFavorite}
      {...{
        [TREE_KEY_ATTRIBUTE]: row.key,
        [DROP_TARGET_ATTRIBUTE]: row.location ?? DESKTOP_DROP_TARGET,
        [DROP_TARGET_NAME_ATTRIBUTE]: row.label,
        [FAVORITES_INDEX_ATTRIBUTE]: favoriteIndex,
      }}
      label={row.label}
      icon={icon}
      aria-level={row.level + 1}
      tabIndex={isFocusable ? 0 : -1}
      onClick={() => {
        onNavigate(row);
      }}
      onFocus={() => {
        onFocus(row);
      }}
      onKeyDown={handleKeyDown}
      onChevronClick={() => {
        onToggle(row, row.expand !== 'expanded');
      }}
      className="w-size-navigation-item-width"
    />
  );
}

/**
 * 위치 아이콘. 탭·위치 칸·탐색 창이 함께 쓴다. 자산은 `getExplorerLocationIcon`이 고르고(경로 꺾쇠 목록도 같은 함수를 쓴다), 여기서 그린다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[파일 탐색기:탐색 창]]
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 아이콘
 */
function renderLocationIcon(workspace: ExplorerWorkspace, location: ExplorerLocation): ReactNode {
  const name = getExplorerLocationIcon(workspace, location);
  if (name === DESKTOP_LOCATION_ICON) {
    // 한 가지 색 아이콘이라 글자 색으로 칠한다(피그마 데스크톱 아이콘).
    return <Asset name={name} className="text-color-black-89" />;
  }
  return <ImageAsset name={name} />;
}
