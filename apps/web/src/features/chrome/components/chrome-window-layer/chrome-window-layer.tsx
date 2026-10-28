import { type JSX, type KeyboardEvent, useRef, useState } from 'react';

import { ChromeAddressField } from '@/features/chrome/components/chrome-address-field/chrome-address-field';
import { ChromeNewTabSearchField } from '@/features/chrome/components/chrome-new-tab-search-field/chrome-new-tab-search-field';
import {
  ChromePage,
  type ChromePageLatestPost,
  type ChromePageSearchResult,
} from '@/features/chrome/components/chrome-page/chrome-page';
import {
  ChromePageArea,
  type ChromePageFind,
  type ChromePageImage,
} from '@/features/chrome/components/chrome-page-area/chrome-page-area';
import { ChromePostTab } from '@/features/chrome/components/chrome-post-tab/chrome-post-tab';
import { ChromeWindow } from '@/features/chrome/components/chrome-window/chrome-window';
import { TRASHED_POST_MESSAGE } from '@/features/chrome/components/message-box-trashed-post/message-box-trashed-post';
import type { PostImageBlock } from '@/features/chrome/components/post-blocks/post-blocks';
import { useChromeZoomStore } from '@/features/chrome/stores/chrome-zoom-store/chrome-zoom-store';
import {
  type AddressSuggestionTarget,
  getAddressSuggestions,
  getPageAddress,
  getPostAddress,
  resolveAddress,
  searchPosts,
} from '@/features/chrome/utils/chrome-address/chrome-address';
import { getChromeMoreMenuEntries } from '@/features/chrome/utils/chrome-more-menu/chrome-more-menu';
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
import { DEFAULT_ZOOM } from '@/features/chrome/utils/chrome-zoom/chrome-zoom';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MessageBoxDialog } from '@/shared/components/message-box-dialog/message-box-dialog';
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
  getLatestPosts,
  getPostItemId,
  isItemInTrash,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

// Chrome 새 탭 페이지에 보이는 최신 글 개수(피그마 Chrome/Page `Page=New tab`).
const NEW_TAB_LATEST_POST_COUNT = 6;

/** 열린 찾기 막대와 그 막대를 연 페이지 */
type FindState = ChromePageFind & {
  /** 막대를 연 페이지(탭과 기록 차례). 다른 페이지로 가면 막대를 닫는다 */
  pageKey: string;
};

/** 크게 보는 이미지와 그 이미지가 있는 페이지 */
type ImageViewerState = ChromePageImage & {
  /** 이미지가 있는 페이지(탭과 기록 차례) */
  pageKey: string;
};

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
 * 탭(새 탭, 고르기, 닫기, 끌어 옮기기), 뒤로·앞으로·새로고침, 주소창(추천, 주소 해석), ⋮ 메뉴(링크 복사, 페이지에서 찾기, 확대/축소)를 잇고,
 * 고른 탭의 페이지(새 탭 페이지, 글, 검색 결과, 찾을 수 없음)를 그린다. 마지막 탭을 닫으면 창을 닫는다.
 * 모바일은 탭 하나만 쓴다(탭 줄이 없다).
 * 새로고침은 지금 페이지를 다시 그린다. 그 횟수, 찾기 막대, 크게 보는 이미지, 휴지통 글 메시지 상자는 이 창 안에서만 쓰는 일시 상태다.
 * 찾기 막대와 크게 보기는 다른 페이지로 가거나 탭을 바꾸면 닫는다.
 * Chrome 창에 포커스가 있을 때 Ctrl+F(찾기)와 Ctrl + `+`·`-`·`0`(배율)을 받고 실제 브라우저의 같은 동작은 막는다.
 * 휴지통에 있는 글을 주소로 열면(주소창, 새 탭 검색창, 글 속 링크) 바로 열지 않고 복원할지 묻는다.
 * @codocs [[Chrome:구성]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @codocs [[Chrome:페이지에서 찾기]]
 * @codocs [[Chrome:확대/축소]]
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ChromeWindowLayer(props: ChromeWindowLayerProps): JSX.Element {
  const { windowId, content, controls, device } = props;
  const items = useWorkspaceStore((state) => state.items);
  const restoreTrashedPost = useWorkspaceStore((state) => state.restoreTrashedPost);
  const setContent = useWindowStore((state) => state.setContent);
  const zoom = useChromeZoomStore((state) => state.zoom);
  const zoomIn = useChromeZoomStore((state) => state.zoomIn);
  const zoomOut = useChromeZoomStore((state) => state.zoomOut);
  const resetZoom = useChromeZoomStore((state) => state.resetZoom);
  const [reloadCount, setReloadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [find, setFind] = useState<FindState | null>(null);
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [trashedSlug, setTrashedSlug] = useState<string | null>(null);
  // ⋮ 메뉴에서 찾기를 열면 메뉴가 닫힌 뒤 포커스를 ⋮ 버튼으로 돌리지 않는다(찾기 입력칸에 둔다).
  const menuFocusKeeper = useMenuFocusKeeper();
  const workspace = { items };
  const activeTab = getActiveChromeTab(content);
  const page: ChromeTabPage =
    activeTab === undefined ? { kind: 'new-tab' } : getChromeTabPage(activeTab);
  const pageKey = `${activeTab?.id ?? ''}-${String(activeTab?.historyIndex ?? 0)}`;
  const isMobile = device === 'mobile';
  const post = page.kind === 'post' ? findPost(workspace, page.slug) : undefined;
  // 다른 페이지로 가면(창 밖에서 창 내용을 바꾼 경우 포함) 찾기 막대와 크게 보기를 닫는다.
  const activeFind = find?.pageKey === pageKey ? find : null;
  const activeImageViewer = imageViewer?.pageKey === pageKey ? imageViewer : null;

  /**
   * 창 내용을 바꾼다. 페이지나 탭이 바뀌므로 찾기 막대와 크게 보기를 닫는다.
   * @param next 새 창 내용
   */
  function update(next: ChromeWindowContent): void {
    setFind(null);
    setImageViewer(null);
    setContent(windowId, next);
  }

  /**
   * 고른 탭에서 페이지로 간다. 휴지통에 있는 글이면 바로 열지 않고 복원할지 묻는다.
   * @codocs [[Chrome:휴지통에 있는 글]]
   * @param target 갈 페이지
   */
  function handleNavigate(target: ChromeTabPage): void {
    if (target.kind === 'post' && isTrashedPost(workspace, target.slug)) {
      setTrashedSlug(target.slug);
      return;
    }
    update(navigateChromeTab(content, target));
  }

  /**
   * 휴지통 글 메시지 상자의 복원: 그 글을 복원하고 연다.
   * @codocs [[Chrome:휴지통에 있는 글]]
   */
  function handleTrashedPostRestore(): void {
    if (trashedSlug === null) {
      return;
    }
    const result = restoreTrashedPost(getPostItemId(trashedSlug));
    if (result.ok) {
      update(navigateChromeTab(content, { kind: 'post', slug: trashedSlug }));
    }
  }

  /**
   * 휴지통 글 메시지 상자가 닫힐 때(복원, 취소, Esc). 취소면 보던 페이지를 그대로 둔다.
   * @param isOpen 열림 여부
   */
  function handleTrashedDialogOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      setTrashedSlug(null);
    }
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
   * 글 본문 링크가 블로그 안의 페이지(글, 찾을 수 없음 등)인지 본다. 외부 주소는 null이다.
   * @codocs [[Chrome:글 화면]]
   * @param href 링크 주소
   * @returns 블로그 안의 페이지. 외부 주소면 null
   */
  function resolveLink(href: string): ChromeTabPage | null {
    const action = resolveAddress(href, workspace, window.location.host);
    return action?.type === 'page' && action.page.kind !== 'search' ? action.page : null;
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

  /**
   * ⋮ 메뉴가 닫힌 뒤 포커스를 돌려줄지. 메뉴에서 찾기를 열었으면 돌려주지 않는다.
   * @returns 돌려주면 true
   */
  function getMenuFinalFocus(): boolean {
    return menuFocusKeeper.shouldReturnFocus();
  }

  /**
   * 찾기 막대를 연다. 이미 열려 있으면 입력칸에 포커스를 주고 글자를 모두 선택한다.
   * @codocs [[Chrome:페이지에서 찾기]]
   */
  function openFind(): void {
    setFind(
      /**
       * 같은 페이지에서 다시 열면 찾던 글자를 둔다.
       * @param current 지금 찾기 막대
       * @returns 연 찾기 막대
       */
      (current) => ({
        pageKey,
        query: current?.pageKey === pageKey ? current.query : '',
        focusRequest: (current?.focusRequest ?? 0) + 1,
      }),
    );
  }

  /**
   * 찾는 글자를 바꾼다. 입력할 때마다 다시 찾는다.
   * @param query 찾는 글자
   */
  function handleFindQueryChange(query: string): void {
    setFind((current) => (current === null ? null : { ...current, query }));
  }

  /** 찾기 막대를 닫는다. 강조도 지운다. */
  function handleFindClose(): void {
    setFind(null);
  }

  /**
   * 본문 이미지를 크게 본다.
   * @param block 이미지 블록
   * @param trigger 누른 이미지(닫은 뒤 포커스를 돌려줄 곳)
   */
  function handleImageOpen(block: PostImageBlock, trigger: HTMLElement): void {
    setImageViewer({ pageKey, block, trigger });
  }

  /** 크게 보기를 닫고 원래 이미지로 포커스를 돌린다. */
  function handleImageClose(): void {
    const trigger = activeImageViewer?.trigger;
    setImageViewer(null);
    trigger?.focus();
  }

  /**
   * Chrome 창 단축키. Ctrl+F는 찾기, Ctrl + `+`·`-`·`0`은 배율이고 실제 브라우저의 같은 동작은 막는다.
   * 크게 보기가 열려 있으면 찾기 막대를 열지 않는다(포커스가 크게 보기 밖으로 나가지 않게).
   * @codocs [[Chrome:페이지에서 찾기]]
   * @codocs [[Chrome:확대/축소]]
   * @param event 키 이벤트
   */
  function handleWindowKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const isCommand = event.ctrlKey || event.metaKey;
    if (!isCommand || event.altKey || event.nativeEvent.isComposing) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'f') {
      event.preventDefault();
      if (activeImageViewer === null) {
        openFind();
      }
    } else if (key === '+' || key === '=') {
      event.preventDefault();
      zoomIn();
    } else if (key === '-') {
      event.preventDefault();
      zoomOut();
    } else if (key === '0') {
      event.preventDefault();
      resetZoom();
    }
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
      setContent(windowId, moveTab(latest, from, to));
    }
  }

  /** 새 탭을 새 탭 페이지로 연다. */
  function handleNewTab(): void {
    update(openChromeTab(content));
  }

  /** ⋮ 메뉴의 페이지에서 찾기: 찾기 막대를 열고, 메뉴가 닫힌 뒤에도 입력칸 포커스를 지킨다. */
  function handleMenuFind(): void {
    menuFocusKeeper.keep();
    openFind();
  }

  /**
   * ⋮ 메뉴 항목을 정한다.
   * @returns 메뉴 항목
   */
  function getMoreMenuItems(): MenuPopupEntry[] {
    return getChromeMoreMenuEntries({
      isMobile,
      canCopyLink: post !== undefined,
      canGoForward: canGoForward(content),
      zoom,
      onCopyLink: () => {
        if (post !== undefined) {
          copyItemLink(post);
        }
      },
      onFind: handleMenuFind,
      onZoomOut: zoomOut,
      onZoomIn: zoomIn,
      onForward: handleForward,
      onRefresh: handleRefresh,
    });
  }

  return (
    <ChromeWindow
      {...controls}
      device={device}
      onKeyDown={handleWindowKeyDown}
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
      moreMenuFinalFocus={getMenuFinalFocus}
    >
      <ChromePageArea
        device={device}
        find={activeFind}
        onFindQueryChange={handleFindQueryChange}
        onFindClose={handleFindClose}
        image={activeImageViewer}
        onImageClose={handleImageClose}
      >
        <ChromeTabContent
          // 페이지를 옮기거나 새로고침하면 페이지를 새로 그려 스크롤이 처음으로 돌아간다.
          key={`${pageKey}-${String(reloadCount)}`}
          page={page}
          post={post}
          workspace={workspace}
          device={device}
          zoom={zoom / DEFAULT_ZOOM}
          onNavigate={handleNavigate}
          onAddressSubmit={handleAddressSubmit}
          getSuggestions={getSuggestions}
          onSuggestionOpen={handleSuggestionOpen}
          resolveLink={resolveLink}
          onReload={handleRefresh}
          onImageOpen={handleImageOpen}
        />
      </ChromePageArea>
      <MessageBoxDialog
        {...TRASHED_POST_MESSAGE}
        open={trashedSlug !== null}
        onOpenChange={handleTrashedDialogOpenChange}
        onPrimaryClick={handleTrashedPostRestore}
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
  /** 페이지 본문 배율(1이 100%) */
  zoom: number;
  /** 탭 안에서 페이지로 갈 때 */
  onNavigate: (page: ChromeTabPage) => void;
  /** 새 탭 페이지 검색창에서 추천을 고르지 않고 Enter를 눌렀을 때(주소창과 같다) */
  onAddressSubmit: (text: string) => void;
  /** 새 탭 페이지 검색창의 추천 목록을 구한다(주소창과 같다) */
  getSuggestions: (query: string) => readonly AddressSuggestionTarget[];
  /** 새 탭 페이지 검색창에서 추천을 골랐을 때 */
  onSuggestionOpen: (target: AddressSuggestionTarget) => void;
  /** 찾을 수 없음 화면의 새로고침 버튼을 눌렀을 때 */
  onReload: () => void;
  /** 글 본문 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다 */
  resolveLink: (href: string) => ChromeTabPage | null;
  /** 글 본문 이미지를 눌렀을 때(크게 보기) */
  onImageOpen: (block: PostImageBlock, trigger: HTMLElement) => void;
};

/**
 * 고른 탭의 페이지를 그린다. 새 탭 페이지는 휴지통에 없는 최신 글 바로가기와 주소창처럼 동작하는 검색창,
 * 검색 결과는 제목에 검색어가 든 글이다. 글 화면은 `ChromePostTab`이 그린다. 색인에 없는 글은 찾을 수 없음 화면이다.
 * 모든 페이지 본문에 배율을 건다.
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @codocs [[Chrome:확대/축소]]
 * @param props
 * @returns 탭 내용
 */
function ChromeTabContent(props: ChromeTabContentProps): JSX.Element {
  const {
    page,
    post,
    workspace,
    device,
    zoom,
    onNavigate: handleNavigate,
    onAddressSubmit: handleAddressSubmit,
    getSuggestions,
    onSuggestionOpen: handleSuggestionOpen,
    onReload: handleReload,
    resolveLink,
    onImageOpen: handleImageOpen,
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
          zoom={zoom}
          latestPosts={posts.map(toLatestPost)}
          onLatestPostOpen={handlePostOpen}
          search={
            <ChromeNewTabSearchField
              getSuggestions={getSuggestions}
              onSuggestionOpen={handleSuggestionOpen}
              onSubmit={handleAddressSubmit}
            />
          }
        />
      );
    case 'search':
      return (
        <ChromePage
          page="search-results"
          layout={layout}
          className={className}
          zoom={zoom}
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
            zoom={zoom}
            url={getPostAddress(page.slug)}
            onReload={handleReload}
          />
        );
      }
      return (
        <ChromePostTab
          post={post}
          workspace={workspace}
          layout={layout}
          zoom={zoom}
          resolveLink={resolveLink}
          onNavigate={handleNavigate}
          onReload={handleReload}
          onImageOpen={handleImageOpen}
        />
      );
    case 'not-found':
      return (
        <ChromePage
          page="not-found"
          layout={layout}
          className={className}
          zoom={zoom}
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
 * 글이 휴지통에 있는지(휴지통에 든 폴더 안 포함) 본다.
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @param workspace 작업 공간
 * @param slug 글 slug
 * @returns 휴지통에 있으면 true
 */
function isTrashedPost(workspace: Pick<WorkspaceState, 'items'>, slug: string): boolean {
  const target = findPost(workspace, slug);
  return target !== undefined && isItemInTrash(workspace, target.id);
}

/** 메뉴가 닫힌 뒤 포커스를 메뉴 버튼으로 돌려줄지 정하는 표시 */
type MenuFocusKeeper = {
  /** 메뉴가 닫힌 뒤 포커스를 돌려주지 않게 표시한다. 메뉴 항목을 고를 때 부른다 */
  keep: () => void;
  /** 메뉴가 닫힐 때 부른다. 포커스를 돌려주면 true이고, 표시를 지운다 */
  shouldReturnFocus: () => boolean;
};

/**
 * 메뉴 항목이 메뉴가 닫힌 뒤의 포커스를 지키게 하는 표시를 만든다. 렌더링과 상관없는 값이라 ref에 둔다.
 * 메뉴 항목 함수에 넘기는 동작이 ref를 직접 만지지 않게 감싼다.
 * @returns 표시를 바꾸고 읽는 함수
 */
function useMenuFocusKeeper(): MenuFocusKeeper {
  const shouldKeepRef = useRef(false);
  return {
    keep: () => {
      shouldKeepRef.current = true;
    },
    shouldReturnFocus: () => {
      const shouldReturn = !shouldKeepRef.current;
      shouldKeepRef.current = false;
      return shouldReturn;
    },
  };
}
