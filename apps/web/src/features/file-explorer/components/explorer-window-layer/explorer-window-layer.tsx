import { type JSX, type KeyboardEvent, type ReactNode, useEffect } from 'react';

import { Asset, BreadcrumbItem, ImageAsset, NavigationItem } from '@seojaewan/design-system';

import { ExplorerBody } from '@/features/file-explorer/components/explorer-body/explorer-body';
import { ExplorerWindow } from '@/features/file-explorer/components/explorer-window/explorer-window';
import {
  type ExplorerWorkspace,
  getExplorerLocationName,
  getExplorerLocationTrail,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import {
  canGoBack,
  canGoForward,
  closeTab,
  getActiveTab,
  getCurrentLocation,
  getFocusableTreeKey,
  getNavigationRows,
  getParentLocation,
  getTabLocation,
  goBack,
  goForward,
  goUp,
  moveTab,
  navigateTo,
  type NavigationRow,
  openNewTab,
  type OrderFolders,
  resolveExplorerContent,
  selectTab,
  setTreeNodeExpanded,
} from '@/features/file-explorer/utils/explorer-navigation/explorer-navigation';
import { sortExplorerItems } from '@/features/file-explorer/utils/explorer-sort/explorer-sort';
import type { Device } from '@/shared/hooks/use-device/use-device';
import {
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';
import { useItemDragStore } from '@/shared/stores/item-drag-store/item-drag-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type {
  ExplorerLocation,
  ExplorerWindowContent,
  WindowFrameControls,
} from '@/shared/utils/window-rules/window-rules';
import {
  DEFAULT_EXPLORER_VIEW,
  DESKTOP_LOCATION_KEY,
  isRecycleBinFull,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

type ExplorerWindowLayerProps = {
  /** 창 id. 창 내용(탭과 위치 기록)을 바꿀 때 쓴다 */
  windowId: string;
  /** 창 내용(탭, 탭마다의 위치 기록, 탐색 창 펼침) */
  content: ExplorerWindowContent;
  /** 창 층이 넘기는 창 동작 속성 */
  controls: WindowFrameControls;
  /** 화면 방식 */
  device: Device;
};

/**
 * 탐색기 창 하나를 작업 공간 저장소와 창 저장소에 잇는 층이다. 창 내용(탭과 위치 기록)은 창 저장소에 두어,
 * 작업 표시줄 미리보기나 Snap Assist가 창을 다시 그려도 같은 모습이다.
 * 고른 탭이 보는 위치의 이름(탭, 검색 안내 글자), 위치 칸, 탐색 창 폴더 트리, 항목, 항목 개수를 그리고,
 * 폴더 열기·위치 칸·탐색 창·뒤로·앞으로·위로·Backspace·Alt + ← / →로 같은 탭에서 위치를 옮긴다.
 * 항목과 항목 조작은 본문(`ExplorerBody`)이 맡는다. 탐색 창의 하위 폴더는 그 위치에 기억한 정렬을 따른다.
 * 모바일은 탭 하나만 쓴다(탭 줄이 없다).
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ExplorerWindowLayer(props: ExplorerWindowLayerProps): JSX.Element {
  const { windowId, content, controls, device } = props;
  const items = useWorkspaceStore((state) => state.items);
  const setContent = useWindowStore((state) => state.setContent);
  const workspace = { items };
  const location = getCurrentLocation(content);
  const explorerViews = useWorkspaceStore((state) => state.explorerViews);
  const dragTargetId = useItemDragStore((state) => state.targetId);
  const locationName = getExplorerLocationName(workspace, location);
  const trail = getExplorerLocationTrail(workspace, location);
  const visibleTrail = device === 'mobile' ? trail.slice(-1) : trail;
  const activeTab = getActiveTab(content);
  const navigationRows = getNavigationRows(content, workspace, orderFolders);
  const focusableTreeKey = getFocusableTreeKey(navigationRows, content, workspace);

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
   * 창 내용을 바꾼다.
   * @param next 새 창 내용
   */
  function update(next: ExplorerWindowContent): void {
    setContent(windowId, next);
  }

  /**
   * 고른 탭에서 위치로 간다.
   * @param target 갈 위치
   */
  function handleNavigate(target: ExplorerLocation): void {
    update(navigateTo(content, workspace, target));
  }

  /** 뒤로 간다. */
  function handleBack(): void {
    update(goBack(content, workspace));
  }

  /** 앞으로 간다. */
  function handleForward(): void {
    update(goForward(content, workspace));
  }

  /** 상위 위치로 간다. */
  function handleUp(): void {
    update(goUp(content, workspace));
  }

  /**
   * 탭을 고른다.
   * @param index 탭 차례
   */
  function handleTabSelect(index: number): void {
    update(selectTab(content, workspace, index));
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
    update(openNewTab(content, workspace, target));
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

  /** 새 탭을 `Blog` 폴더로 연다. */
  function handleNewTab(): void {
    update(openNewTab(content, workspace));
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
            selected: index === content.activeTabIndex,
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
        onNavigate={handleNavigate}
        onOpenInNewTab={handleOpenInNewTab}
        locationIcon={renderLocationIcon(workspace, location)}
        searchPlaceholder={`${locationName} 검색`}
        path={visibleTrail.map(
          /**
           * 위치 칸 하나를 그린다. 마지막 칸이 현재 위치이고, 누르면 그 위치로 간다.
           * @param entry 위치와 이름
           * @param index 차례
           * @returns BreadcrumbItem
           */
          (entry, index) => {
            const isCurrent = index === visibleTrail.length - 1;
            return (
              <BreadcrumbItem
                // 위치 이름은 겹칠 수 있어(다른 위치의 같은 이름 폴더) 차례를 함께 쓴다.
                key={`${String(index)}-${entry.location ?? 'desktop'}`}
                label={entry.name}
                current={isCurrent}
                showSeparator={!isCurrent}
                onLabelClick={() => {
                  handleNavigate(entry.location);
                }}
                className="shrink-0"
              />
            );
          },
        )}
        navigation={navigationRows.map(
          /**
           * 탐색 창 트리 칸 하나를 그린다. 누르면 그 위치로 가고, 꺾쇠를 누르면 펼치거나 접는다.
           * @param row 트리 칸
           * @returns NavigationItem
           */
          (row) => (
            <NavigationTreeItem
              key={row.key}
              row={row}
              isFocusable={row.key === focusableTreeKey}
              isDropTarget={row.key === dragTargetId}
              icon={
                row.icon === 'recycle-bin'
                  ? renderLocationIcon(workspace, RECYCLE_BIN_ID)
                  : NAVIGATION_ICONS[row.icon]
              }
              onNavigate={handleNavigate}
              onToggle={handleTreeToggle}
            />
          ),
        )}
        backDisabled={!canGoBack(content)}
        forwardDisabled={!canGoForward(content)}
        upDisabled={getParentLocation(workspace, location) === undefined}
        onBack={handleBack}
        onForward={handleForward}
        onUp={handleUp}
        onKeyDown={handleKeyDown}
      />
    </ExplorerWindow>
  );
}

type NavigationTreeItemProps = {
  /** 트리 칸 */
  row: NavigationRow;
  /** 끄는 항목을 이 칸에 놓으려는 중인지. 강조한다 */
  isDropTarget: boolean;
  /** Tab으로 닿는 칸인지. 고른 칸이 보이지 않으면 가장 가까운 보이는 조상이다 */
  isFocusable: boolean;
  /** 칸 아이콘 */
  icon: ReactNode;
  /** 칸을 눌렀을 때 그 위치로 간다 */
  onNavigate: (location: ExplorerLocation) => void;
  /** 꺾쇠나 → / ← 키로 펼치거나 접을 때 */
  onToggle: (row: NavigationRow, isExpanded: boolean) => void;
};

/**
 * 탐색 창 트리 칸 하나. 클릭·Enter·Space로 그 위치로 가고, 꺾쇠·→·←로 펼치거나 접는다.
 * 고른 칸(현재 위치, 보이지 않으면 가장 가까운 보이는 조상)만 Tab으로 닿는다. 항목을 끌어 놓을 곳이기도 하다.
 * @codocs [[파일 탐색기:구성]]
 * @param props
 */
function NavigationTreeItem(props: NavigationTreeItemProps): JSX.Element {
  const { row, isFocusable, isDropTarget, icon, onNavigate, onToggle } = props;

  /**
   * 트리 칸에서 키를 눌렀을 때 이동하거나 펼치고 접는다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(row.location);
    } else if (event.key === 'ArrowRight' && row.expand === 'collapsed') {
      event.preventDefault();
      onToggle(row, true);
    } else if (event.key === 'ArrowLeft' && row.expand === 'expanded') {
      event.preventDefault();
      onToggle(row, false);
    }
  }

  return (
    <NavigationItem
      level={row.level}
      expand={row.expand}
      selected={row.selected || isDropTarget}
      {...{ [DROP_TARGET_ATTRIBUTE]: row.key, [DROP_TARGET_NAME_ATTRIBUTE]: row.label }}
      label={row.label}
      icon={icon}
      aria-level={row.level + 1}
      tabIndex={isFocusable ? 0 : -1}
      onClick={() => {
        onNavigate(row.location);
      }}
      onKeyDown={handleKeyDown}
      onChevronClick={() => {
        onToggle(row, row.expand !== 'expanded');
      }}
      className="w-240"
    />
  );
}

// 탐색 창 아이콘이다. 피그마 Window/Explorer의 탐색 창 인스턴스(데스크톱 아이콘, file/Folder)와 같다. 휴지통은 찬·빈 모양을 고른다.
const NAVIGATION_ICONS = {
  desktop: (
    <Asset
      name="icons/ic_fluent_desktop_20_regular.svg"
      className="size-icon-16 text-text-fill-primary"
    />
  ),
  folder: <ImageAsset name="images/file-folder" className="size-full object-contain" />,
} as const;

/**
 * 위치 아이콘(탭, 위치 칸). 휴지통은 찬·빈 모양, 그 밖은 폴더다.
 * @param workspace 작업 공간
 * @param folderId 위치
 * @returns 아이콘
 */
function renderLocationIcon(workspace: ExplorerWorkspace, folderId: string | null): ReactNode {
  if (folderId === RECYCLE_BIN_ID) {
    return (
      <ImageAsset
        name={
          isRecycleBinFull(workspace)
            ? 'images/file-recycle-bin-full'
            : 'images/file-recycle-bin-empty'
        }
        className="size-full object-contain"
      />
    );
  }
  return <ImageAsset name="images/file-folder" className="size-full object-contain" />;
}
