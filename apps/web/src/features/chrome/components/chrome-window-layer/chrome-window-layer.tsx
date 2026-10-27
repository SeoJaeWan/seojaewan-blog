import { type JSX, useState } from 'react';

import { ChromeAddressField } from '@/features/chrome/components/chrome-address-field/chrome-address-field';
import {
  ChromePage,
  type ChromePageLatestPost,
  type ChromePageSearchResult,
} from '@/features/chrome/components/chrome-page/chrome-page';
import { ChromeWindow } from '@/features/chrome/components/chrome-window/chrome-window';
import {
  type AddressSuggestionTarget,
  getAddressSuggestions,
  getPageAddress,
  getPostAddress,
  resolveAddress,
  searchPosts,
} from '@/features/chrome/utils/chrome-address/chrome-address';
import {
  canGoBack,
  canGoForward,
  closeTab,
  goBack,
  goForward,
  moveTab,
  selectTab,
} from '@/features/chrome/utils/chrome-navigation/chrome-navigation';
import { getChromeTabTitle } from '@/features/chrome/utils/chrome-tab-title/chrome-tab-title';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import {
  type ChromeTabPage,
  type ChromeWindowContent,
  getActiveChromeTab,
  getChromeTabPage,
  navigateChromeTab,
  openChromeTab,
} from '@/shared/utils/chrome-tabs/chrome-tabs';
import { copyItemLink } from '@/shared/utils/item-link/item-link';
import type { WindowFrameControls } from '@/shared/utils/window-rules/window-rules';
import {
  getFolderPath,
  getLatestPosts,
  getPostItemId,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

// Chrome 새 탭 페이지에 보이는 최신 글 개수(피그마 Chrome/Page `Page=New tab`).
const NEW_TAB_LATEST_POST_COUNT = 6;

// ⋮ 메뉴 아이콘이다(피그마 Menu/ChromeMore, Menu/ChromeMoreMobile).
const MENU_ICONS = {
  link: 'icons/ic_fluent_link_20_regular.svg',
  search: 'icons/ic_fluent_search_20_regular.svg',
  zoomIn: 'icons/ic_fluent_zoom_in_20_regular.svg',
  forward: 'icons/ic_fluent_arrow_right_20_regular.svg',
  refresh: 'icons/ic_fluent_arrow_clockwise_20_regular.svg',
} as const;

// 글 머리의 폴더 경로 사이와 경로·작성일 사이 글자다(피그마 Chrome/Page `Page=Post`의 `Blog › React · 2026-10-20`).
const META_PATH_SEPARATOR = ' › ';
const META_DATE_SEPARATOR = ' · ';

type ChromeWindowLayerProps = {
  /** 창 id. 창 내용(탭과 탭마다의 기록)을 바꿀 때 쓴다 */
  windowId: string;
  /** Chrome 창 내용(탭, 탭마다의 기록, 고른 탭) */
  content: ChromeWindowContent;
  /** 창 층이 넘기는 창 동작 속성 */
  controls: WindowFrameControls;
  /** 화면 방식 */
  device: Device;
};

/**
 * Chrome 창 하나를 작업 공간 저장소와 창 저장소에 잇는 층이다. 창 내용(탭과 탭마다의 기록)은 창 저장소에 두어,
 * 작업 표시줄 미리보기나 Snap Assist가 창을 다시 그려도 같은 모습이다.
 * 탭(새 탭, 고르기, 닫기, 끌어 옮기기), 뒤로·앞으로·새로고침, 주소창(추천, 주소 해석), ⋮ 메뉴(링크 복사)를 잇고,
 * 고른 탭의 페이지(새 탭 페이지, 글, 검색 결과, 찾을 수 없음)를 그린다. 마지막 탭을 닫으면 창을 닫는다.
 * 글 화면은 아직 색인 정보(제목, 폴더, 작성일)만으로 그린다. 모바일은 탭 하나만 쓴다(탭 줄이 없다).
 * 새로고침은 지금 페이지를 다시 그린다. 그 횟수는 이 창 안에서만 쓰는 일시 상태다.
 * @codocs [[Chrome:구성]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ChromeWindowLayer(props: ChromeWindowLayerProps): JSX.Element {
  const { windowId, content, controls, device } = props;
  const items = useWorkspaceStore((state) => state.items);
  const setContent = useWindowStore((state) => state.setContent);
  const [reloadCount, setReloadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const workspace = { items };
  const activeTab = getActiveChromeTab(content);
  const page: ChromeTabPage =
    activeTab === undefined ? { kind: 'new-tab' } : getChromeTabPage(activeTab);
  const pageKey = `${activeTab?.id ?? ''}-${String(activeTab?.historyIndex ?? 0)}`;
  const isMobile = device === 'mobile';
  const post = page.kind === 'post' ? findPost(workspace, page.slug) : undefined;

  /**
   * 창 내용을 바꾼다.
   * @param next 새 창 내용
   */
  function update(next: ChromeWindowContent): void {
    setContent(windowId, next);
  }

  /**
   * 고른 탭에서 페이지로 간다.
   * @param target 갈 페이지
   */
  function handleNavigate(target: ChromeTabPage): void {
    update(navigateChromeTab(content, target));
  }

  /**
   * 주소창(또는 새 탭 페이지 검색창)에 입력한 글자로 간다. 외부 주소는 실제 브라우저의 새 탭에서 연다.
   * @codocs [[Chrome:주소창]]
   * @param text 입력한 글자
   */
  function handleAddressSubmit(text: string): void {
    const action = resolveAddress(text, workspace, window.location.host);
    if (action === null) {
      return;
    }
    if (action.type === 'external') {
      window.open(action.url, '_blank', 'noopener');
      return;
    }
    handleNavigate(action.page);
  }

  /**
   * 고른 추천으로 간다.
   * @param target 추천
   */
  function handleSuggestionOpen(target: AddressSuggestionTarget): void {
    handleNavigate(target.page);
  }

  /**
   * 입력 중인 글자의 추천 목록을 구한다.
   * @param query 입력 중인 글자
   * @returns 추천
   */
  function getSuggestions(query: string): AddressSuggestionTarget[] {
    return getAddressSuggestions(workspace, query);
  }

  /**
   * ⋮ 메뉴를 열거나 닫는다.
   * @param isOpen 열지
   */
  function handleMenuOpenChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  /** 뒤로 간다. */
  function handleBack(): void {
    update(goBack(content));
  }

  /** 앞으로 간다. */
  function handleForward(): void {
    update(goForward(content));
  }

  /** 지금 페이지를 다시 그린다. */
  function handleRefresh(): void {
    setReloadCount((count) => count + 1);
  }

  /**
   * 탭을 고른다.
   * @param index 탭 차례
   */
  function handleTabSelect(index: number): void {
    update(selectTab(content, index));
  }

  /**
   * 탭을 닫는다. 마지막 탭이면 창을 닫는다.
   * @param index 탭 차례
   */
  function handleTabClose(index: number): void {
    const next = closeTab(content, index);
    if (next === null) {
      controls.onClose();
      return;
    }
    update(next);
  }

  /**
   * 탭을 끌어 다른 자리로 옮긴다.
   * @param from 옮길 탭의 차례
   * @param to 옮길 자리
   */
  function handleTabMove(from: number, to: number): void {
    // 끄는 동안 여러 번 옮기므로, 그린 때의 내용이 아니라 저장소의 지금 내용에서 옮긴다.
    const latest = useWindowStore.getState().windows[windowId]?.content;
    if (latest?.app === 'chrome') {
      update(moveTab(latest, from, to));
    }
  }

  /** 새 탭을 새 탭 페이지로 연다. */
  function handleNewTab(): void {
    update(openChromeTab(content));
  }

  /**
   * ⋮ 메뉴 항목을 정한다. 링크 복사는 글을 보고 있을 때만 된다. 페이지에서 찾기와 확대/축소는 디자인이 없어 비활성이다.
   * 모바일은 앞으로·새로고침을 메뉴 맨 위에 둔다.
   * @codocs [[Chrome:구성]]
   * @codocs [[모바일:차이]]
   * @returns 메뉴 항목
   */
  function getMoreMenuItems(): MenuPopupEntry[] {
    const entries: MenuPopupEntry[] = [
      {
        label: '링크 복사',
        icon: MENU_ICONS.link,
        disabled: post === undefined,
        onClick: () => {
          if (post !== undefined) {
            copyItemLink(post);
          }
        },
      },
      {
        label: '페이지에서 찾기',
        icon: MENU_ICONS.search,
        shortcut: isMobile ? undefined : 'Ctrl+F',
        disabled: true,
      },
      { label: '확대/축소', icon: MENU_ICONS.zoomIn, shortcut: '100%', disabled: true },
    ];
    if (!isMobile) {
      return entries;
    }
    return [
      {
        label: '앞으로',
        icon: MENU_ICONS.forward,
        disabled: !canGoForward(content),
        onClick: handleForward,
      },
      { label: '새로고침', icon: MENU_ICONS.refresh, onClick: handleRefresh },
      { kind: 'separator' },
      ...entries,
    ];
  }

  return (
    <ChromeWindow
      {...controls}
      device={device}
      tabs={content.tabs.map(
        /**
         * 탭 하나의 제목(그 탭이 보는 페이지)을 정한다.
         * @param tab 탭
         * @param index 차례
         * @returns Chrome 창 탭
         */
        (tab, index) => ({
          id: tab.id,
          title: getChromeTabTitle(workspace, getChromeTabPage(tab)),
          active: index === content.activeTabIndex,
        }),
      )}
      url={getPageAddress(page)}
      addressBar={
        <ChromeAddressField
          // 탭을 바꾸거나 페이지를 옮기면 입력 중이던 글자를 버리고 그 페이지의 주소를 보인다.
          key={pageKey}
          address={getPageAddress(page)}
          getSuggestions={getSuggestions}
          onSuggestionOpen={handleSuggestionOpen}
          onSubmit={handleAddressSubmit}
        />
      }
      backDisabled={!canGoBack(content)}
      forwardDisabled={!canGoForward(content)}
      onBack={handleBack}
      onForward={handleForward}
      onRefresh={handleRefresh}
      onTabSelect={handleTabSelect}
      onTabClose={handleTabClose}
      onTabMove={handleTabMove}
      onNewTab={handleNewTab}
      moreMenuItems={getMoreMenuItems()}
      isMoreMenuOpen={isMenuOpen}
      onMoreMenuOpenChange={handleMenuOpenChange}
    >
      <ChromeTabContent
        // 페이지를 옮기거나 새로고침하면 페이지를 새로 그려 스크롤이 처음으로 돌아간다.
        key={`${pageKey}-${String(reloadCount)}`}
        page={page}
        post={post}
        workspace={workspace}
        device={device}
        onNavigate={handleNavigate}
        onAddressSubmit={handleAddressSubmit}
        onReload={handleRefresh}
      />
    </ChromeWindow>
  );
}

type ChromeTabContentProps = {
  /** 고른 탭의 페이지 */
  page: ChromeTabPage;
  /** 글 페이지면 그 글. 색인에 없으면 undefined */
  post: PostItem | undefined;
  /** 작업 공간 */
  workspace: Pick<WorkspaceState, 'items'>;
  /** 화면 방식 */
  device: Device;
  /** 탭 안에서 페이지로 갈 때 */
  onNavigate: (page: ChromeTabPage) => void;
  /** 새 탭 페이지 검색창에서 Enter를 눌렀을 때(주소창과 같다) */
  onAddressSubmit: (text: string) => void;
  /** 찾을 수 없음 화면의 새로고침 버튼을 눌렀을 때 */
  onReload: () => void;
};

/**
 * 고른 탭의 페이지를 그린다. 새 탭 페이지는 휴지통에 없는 최신 글 바로가기, 검색 결과는 제목에 검색어가 든 글이다.
 * 글 화면은 색인 정보로 머리만 그린다. 색인에 없는 글은 찾을 수 없음 화면이다.
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @param props
 * @returns 탭 내용
 */
function ChromeTabContent(props: ChromeTabContentProps): JSX.Element {
  const {
    page,
    post,
    workspace,
    device,
    onNavigate: handleNavigate,
    onAddressSubmit: handleAddressSubmit,
    onReload: handleReload,
  } = props;
  const layout = device === 'mobile' ? 'narrow' : 'wide';
  const className = 'min-h-0 w-full flex-1';
  const posts =
    page.kind === 'new-tab'
      ? getLatestPosts(workspace, NEW_TAB_LATEST_POST_COUNT)
      : page.kind === 'search'
        ? searchPosts(workspace, page.query)
        : [];

  /**
   * 최신 글 바로가기나 검색 결과 글을 누르면 같은 탭에서 그 글로 간다.
   * @param index 누른 글의 순서
   */
  function handlePostOpen(index: number): void {
    const target = posts[index];
    if (target !== undefined) {
      handleNavigate({ kind: 'post', slug: target.slug });
    }
  }

  switch (page.kind) {
    case 'new-tab':
      return (
        <ChromePage
          page="new-tab"
          layout={layout}
          className={className}
          latestPosts={posts.map(toLatestPost)}
          onLatestPostOpen={handlePostOpen}
          onSearchSubmit={handleAddressSubmit}
        />
      );
    case 'search':
      return (
        <ChromePage
          page="search-results"
          layout={layout}
          className={className}
          query={page.query}
          results={posts.map(toSearchResult)}
          onResultOpen={handlePostOpen}
        />
      );
    case 'post':
      if (post === undefined) {
        return (
          <ChromePage
            page="not-found"
            layout={layout}
            className={className}
            url={getPostAddress(page.slug)}
            onReload={handleReload}
          />
        );
      }
      return (
        <ChromePage
          page="post"
          layout={layout}
          className={className}
          meta={getPostMeta(workspace, post)}
          title={post.name}
          toc={[]}
        />
      );
    case 'not-found':
      return (
        <ChromePage
          page="not-found"
          layout={layout}
          className={className}
          url={page.url}
          onReload={handleReload}
        />
      );
  }
}

/**
 * 새 탭 페이지 최신 글 바로가기 하나.
 * @param post 글
 * @returns 바로가기
 */
function toLatestPost(post: PostItem): ChromePageLatestPost {
  return { id: post.id, title: post.name };
}

/**
 * 검색 결과 글 하나.
 * @param post 글
 * @returns 검색 결과
 */
function toSearchResult(post: PostItem): ChromePageSearchResult {
  return { id: post.id, title: post.name, date: post.date, url: getPostAddress(post.slug) };
}

/**
 * 글 색인에서 글을 찾는다.
 * @param workspace 작업 공간
 * @param slug 글 slug
 * @returns 글. 없으면 undefined
 */
function findPost(workspace: Pick<WorkspaceState, 'items'>, slug: string): PostItem | undefined {
  const item = workspace.items[getPostItemId(slug)];
  return item?.kind === 'post' ? item : undefined;
}

/**
 * 글 머리의 작은 글자. 글이 놓인 폴더 경로와 작성일이다(예: `Blog › React · 2026-10-20`).
 * @codocs [[Chrome:글 화면]]
 * @param workspace 작업 공간
 * @param post 글
 * @returns 머리 글자
 */
function getPostMeta(workspace: Pick<WorkspaceState, 'items'>, post: PostItem): string {
  const path =
    post.parentId === null ? [] : getFolderPath(workspace, post.parentId).map((f) => f.name);
  return [...(path.length > 0 ? [path.join(META_PATH_SEPARATOR)] : []), post.date].join(
    META_DATE_SEPARATOR,
  );
}
