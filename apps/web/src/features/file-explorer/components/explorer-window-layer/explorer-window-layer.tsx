import { type JSX, type KeyboardEvent, type ReactNode, useEffect, useState } from 'react';

import {
  Asset,
  BreadcrumbItem,
  DetailsHeader,
  FileItem,
  FileRow,
  ImageAsset,
  NavigationItem,
} from '@seojaewan/design-system';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-content/explorer-content';
import { ExplorerWindow } from '@/features/file-explorer/components/explorer-window/explorer-window';
import {
  type ExplorerWorkspace,
  formatDeletedDate,
  getExplorerLocationName,
  getExplorerLocationTrail,
  getOriginalLocation,
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
  navigateTo,
  type NavigationRow,
  openNewTab,
  resolveExplorerContent,
  selectTab,
  setTreeNodeExpanded,
} from '@/features/file-explorer/utils/explorer-navigation/explorer-navigation';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import type {
  ExplorerLocation,
  ExplorerWindowContent,
  WindowFrameControls,
} from '@/shared/utils/window-rules/window-rules';
import {
  getChildItems,
  isRecycleBinFull,
  type PlacedItem,
  RECYCLE_BIN_ID,
  type WorkspaceItem,
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
 * 폴더 더블클릭·위치 칸·탐색 창·뒤로·앞으로·위로·Backspace·Alt + ← / →로 같은 탭에서 위치를 옮긴다.
 * 폴더는 항목을 보통 아이콘으로, 휴지통은 지운 항목을 자세히 보기(이름 · 원래 위치 · 삭제한 날짜)로 그린다.
 * 항목은 저장소 차례대로 그린다. 선택·정렬·보기 바꾸기는 탐색기 다음 단계에서 붙인다.
 * 모바일은 탭 하나만 쓴다(탭 줄이 없다).
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const workspace = { items };
  const location = getCurrentLocation(content);
  const isRecycleBin = location === RECYCLE_BIN_ID;
  const locationName = getExplorerLocationName(workspace, location);
  const children = getChildItems(workspace, location).filter(
    (item): item is PlacedItem => item.kind !== 'recycle-bin',
  );
  const trail = getExplorerLocationTrail(workspace, location);
  const visibleTrail = device === 'mobile' ? trail.slice(-1) : trail;
  const activeTab = getActiveTab(content);
  const navigationRows = getNavigationRows(content, workspace);
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

  /**
   * 모바일은 항목을 탭하면 연다(바탕화면 아이콘과 같다). 데스크톱의 클릭은 선택이라 다음 단계에서 붙인다.
   * @codocs [[모바일:차이]]
   * @param item 항목
   */
  function handleItemClick(item: PlacedItem): void {
    if (device === 'mobile') {
      handleItemOpen(item);
    }
  }

  /**
   * 항목을 열 때(더블클릭, 모바일 탭) 폴더면 같은 탭에서 그 폴더로 간다. 글·외부 링크 열기는 다음 단계에서 붙인다.
   * @codocs [[파일 탐색기:조작]]
   * @param item 항목
   */
  function handleItemOpen(item: PlacedItem): void {
    if (item.kind === 'folder') {
      handleNavigate(item.id);
    }
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

  /** 항목을 잠깐 감췄다가 다시 보인다. */
  function handleRefresh(): void {
    setIsRefreshing(true);
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
    >
      <ExplorerContent
        // 탭마다 본문을 따로 그려, 탭을 바꾸면 스크롤 위치 같은 본문 상태가 새로 시작한다.
        key={activeTab.id}
        device={device}
        // 같은 탭에서 위치를 옮기면 항목 자리를 새로 그려 스크롤을 맨 위로 돌린다.
        itemsKey={location ?? 'desktop'}
        className="min-h-0 w-full flex-1"
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
        onRefresh={handleRefresh}
        onKeyDown={handleKeyDown}
        commands={
          <ExplorerCommands device={device} location={isRecycleBin ? 'recycle-bin' : 'folder'} />
        }
        itemCount={`항목 ${String(children.length)}개`}
        showSelection={false}
      >
        {isRefreshing
          ? null
          : isRecycleBin
            ? renderRecycleBinDetails(workspace, children)
            : children.map(
                /**
                 * 항목 하나를 보통 아이콘으로 그린다. 폴더는 더블클릭하면 같은 탭에서 그 폴더로 간다.
                 * @param item 항목
                 * @returns FileItem
                 */
                (item) => {
                  return (
                    <FileItem
                      key={item.id}
                      surface="explorer"
                      view="medium"
                      name={item.name}
                      icon={renderItemIcon(item)}
                      onClick={() => {
                        handleItemClick(item);
                      }}
                      onDoubleClick={() => {
                        handleItemOpen(item);
                      }}
                    />
                  );
                },
              )}
      </ExplorerContent>
    </ExplorerWindow>
  );
}

type NavigationTreeItemProps = {
  /** 트리 칸 */
  row: NavigationRow;
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
 * 고른 칸(현재 위치, 보이지 않으면 가장 가까운 보이는 조상)만 Tab으로 닿는다.
 * @codocs [[파일 탐색기:구성]]
 * @param props
 */
function NavigationTreeItem(props: NavigationTreeItemProps): JSX.Element {
  const { row, isFocusable, icon, onNavigate, onToggle } = props;

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
      selected={row.selected}
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
 * 휴지통의 지운 항목을 자세히 보기(이름 · 원래 위치 · 삭제한 날짜)로 그린다.
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param workspace 작업 공간
 * @param items 지운 항목
 * @returns 자세히 보기
 */
function renderRecycleBinDetails(
  workspace: ExplorerWorkspace,
  items: readonly PlacedItem[],
): ReactNode {
  return (
    <div className="flex w-full flex-col items-start">
      <DetailsHeader view="recycle-bin" />
      {items.map(
        /**
         * 지운 항목 한 줄을 그린다.
         * @param item 지운 항목
         * @returns FileRow
         */
        (item) => (
          <FileRow
            key={item.id}
            view="recycle-bin"
            name={item.name}
            originalLocation={getOriginalLocation(workspace, item)}
            deletedDate={formatDeletedDate(item.trash?.deletedAt ?? '')}
            icon={renderItemIcon(item)}
            className="w-full"
          />
        ),
      )}
    </div>
  );
}
