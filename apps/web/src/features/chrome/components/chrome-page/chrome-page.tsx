import type { ComponentProps, JSX, KeyboardEvent, MouseEventHandler, ReactNode, Ref } from 'react';
import { useEffect, useRef } from 'react';

import {
  cn,
  EmptyState,
  ImageAsset,
  ListItem,
  PinnedTile,
  PostCover,
  PostNavCard,
  Separator,
  TileGrid,
  Toc,
  TocItem,
} from '@seojaewan/design-system';

import { ChromeNewTabSearch } from '@/features/chrome/components/chrome-new-tab-search/chrome-new-tab-search';

import { getTocScrollTop } from './utils/toc-scroll/toc-scroll';

export type ChromePageLayout = 'wide' | 'narrow';

/** 목차 항목 하나. level은 들여 쓰기 단계(글에서 가장 높은 제목 단계가 1)이고 없으면 1이다 */
export type ChromePageTocItem = { label: string; isActive?: boolean; level?: 1 | 2 | 3 };

/** 새 탭 최신 글 바로가기 하나. id는 같은 제목의 글을 구분한다 */
export type ChromePageLatestPost = { id?: string; title: string };

/** 검색 결과 글 하나. id는 같은 제목의 글을 구분한다 */
export type ChromePageSearchResult = { id?: string; title: string; date: string; url: string };

type ChromePageCommonProps = {
  layout?: ChromePageLayout;
  className?: string;
  scrollRef?: Ref<HTMLDivElement>;
  zoom?: number;
};

type ChromePostPageProps = {
  page: 'post';
  cover?: ReactNode;
  meta: string;
  title: string;
  toc: readonly ChromePageTocItem[];
  onTocItemSelect?: (index: number) => void;
  isTocExpanded?: boolean;
  onTocToggle?: () => void;
  children?: ReactNode;
  previousTitle?: string;
  nextTitle?: string;
  onPreviousOpen?: () => void;
  onNextOpen?: () => void;
};

type ChromeNewTabPageProps = {
  page: 'new-tab';
  latestPosts: readonly ChromePageLatestPost[];
  onLatestPostOpen?: (index: number) => void;
  search?: ReactNode;
};

type ChromeSearchResultsPageProps = {
  page: 'search-results';
  query: string;
  results: readonly ChromePageSearchResult[];
  onResultOpen?: (index: number) => void;
};

type ChromeNotFoundPageProps = {
  page: 'not-found';
  url: string;
  onReload?: MouseEventHandler<HTMLElement>;
};

type ChromePageProps = ChromePageCommonProps &
  (
    | ChromePostPageProps
    | ChromeNewTabPageProps
    | ChromeSearchResultsPageProps
    | ChromeNotFoundPageProps
  );

// 새 탭 로고 자리의 글자다(Google 로고는 상표라 쓰지 않는다).
const WORDMARK = 'seojaewan.com';

/**
 * 글 화면. wide는 글(최대 720)과 오른쪽 목차(220)를 가운데에 놓고, narrow는 글 머리 아래에 접은 목차를 둔다.
 * wide의 목차는 스크롤해도 오른쪽에 붙어 있다(sticky). 목차 항목이 없으면 목차를 그리지 않는다.
 * narrow의 접은 목차를 누르면 펼치고, 펼친 목차의 머리(제목)를 누르면 다시 접는다(클릭·Enter·Space).
 * 글 맨 아래(꼬리 아래)에 위와 같은 여백을 둔다(피그마 `Chrome/Page` `Page=Post`의 아래 여백, wide `spacing/5xl`·narrow `spacing/2xl`).
 * @codocs [[Chrome:글 화면]]
 * @param props 컴포넌트 속성
 * @param props.layout 피그마 Layout. wide는 넓은 창, narrow는 좁은 창의 배치다. 쓰는 곳이 창 내용 너비로 고른다
 * @param props.cover 커버 이미지(피그마 PostCover `image`). 있으면 제목 위에 그린다. 글 화면은 Notion 커버를 이미지 서버의 크기별 사본으로 넣는다([[Notion 이미지 제공]])
 * @param props.meta 제목 위 작은 글자(폴더 경로와 작성일)
 * @param props.title 글 제목
 * @param props.toc 목차 항목. wide는 오른쪽에 펼치고, narrow는 제목 아래 접은 목차로 보인다. 비어 있으면 목차를 그리지 않는다
 * @param props.children 글 본문 자리. Notion 글을 바꾼 블록(문단, 제목, 코드 블록 등)을 넣는다. 블록 사이 간격은 이 화면이 정한다
 * @param props.previousTitle 이전 글 제목. 없으면 카드를 그리지 않는다
 * @param props.nextTitle 다음 글 제목. 없으면 카드를 그리지 않는다
 * @param props.onTocItemSelect 목차 항목을 눌렀을 때(클릭·Enter·Space). 누른 항목의 순서를 받는다
 * @param props.isTocExpanded narrow에서 목차를 펼쳤는지. 펼치면 접은 목차 대신 항목 목록을 보인다
 * @param props.onTocToggle narrow에서 목차를 누르면 펼치거나 접는다
 * @param props.onPreviousOpen 이전 글 카드를 눌렀을 때(클릭·Enter·Space)
 * @param props.onNextOpen 다음 글 카드를 눌렀을 때(클릭·Enter·Space)
 * @returns 글 화면
 */
function PostPage({
  layout,
  cover,
  meta,
  title,
  toc,
  children,
  previousTitle,
  nextTitle,
  onTocItemSelect,
  isTocExpanded = false,
  onTocToggle,
  onPreviousOpen,
  onNextOpen,
}: ChromePostPageProps & { layout: ChromePageLayout }): JSX.Element {
  const isWide = layout === 'wide';
  const tocRef = useRef<HTMLDivElement>(null);
  const activeTocIndex = toc.findIndex((item) => item.isActive === true);

  useEffect(
    /**
     * 지금 읽는 위치 항목이 목차 안에서 가려지면(목차가 최대 높이를 넘어 스크롤할 때) 그 항목이 보이도록 목차만 스크롤한다.
     * 페이지는 스크롤하지 않는다. 목차의 스크롤 상자는 Toc가 감싼 ScrollArea의 스크롤 영역이다.
     * 부드럽게 스크롤하고, 동작 줄이기에서는 바로 옮긴다.
     * @codocs [[Chrome:글 화면]]
     */
    () => {
      const item = tocRef.current?.querySelector('[aria-current="location"]');
      const list = item?.closest('[data-scrollbar-hidden]');
      if (item === null || item === undefined || list === null || list === undefined) {
        return;
      }
      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const top = getTocScrollTop(
        { top: listRect.top, bottom: listRect.bottom, scrollTop: list.scrollTop },
        { top: itemRect.top, bottom: itemRect.bottom },
      );
      if (top === list.scrollTop) {
        return;
      }
      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollTo({ top, behavior: isReduced ? 'instant' : 'smooth' });
    },
    [activeTocIndex, isWide, isTocExpanded],
  );

  const tocItems = toc.map(
    /**
     * 목차 항목 하나를 그린다.
     * @param item 목차 항목
     * @param index 순서
     * @returns TocItem
     */
    (item, index) => {
      return (
        <TocItem
          key={String(index) + item.label}
          label={item.label}
          level={item.level}
          isActive={item.isActive}
          {...(onTocItemSelect === undefined
            ? {}
            : getOpenableRowProps(() => {
                onTocItemSelect(index);
              }))}
        />
      );
    },
  );
  const hasToc = toc.length > 0;
  const device = isWide ? 'desktop' : 'mobile';
  return (
    <div
      className={
        isWide
          ? 'flex justify-center gap-spacing-5xl px-spacing-3xl pt-spacing-5xl pb-spacing-5xl'
          : 'flex flex-col items-center px-spacing-lg pt-spacing-2xl pb-spacing-2xl'
      }
    >
      <article className="flex w-full max-w-size-post-width min-w-size-none flex-col items-start gap-spacing-lg">
        {cover !== undefined && (
          // 피그마 `cover`는 wide에서 PostCover 높이 그대로(240), narrow에서 140으로 줄여 쓴다
          <PostCover
            image={cover}
            className={isWide ? 'w-full' : 'h-size-post-cover-narrow-height w-full'}
          />
        )}
        <p className="w-full type-caption text-color-black-61">{meta}</p>
        <h1 className={cn('w-full text-color-black-89', isWide ? 'type-title' : 'type-subtitle')}>
          {title}
        </h1>
        {!isWide && hasToc && (
          <Toc
            ref={tocRef}
            isExpanded={isTocExpanded}
            className="w-full"
            {...(onTocToggle === undefined ? {} : getTocToggleProps(isTocExpanded, onTocToggle))}
          >
            {isTocExpanded ? tocItems : undefined}
          </Toc>
        )}
        {children}
        <Separator className="w-full" />
        {/* 피그마 `prev / next` 배치 프레임이다. wide는 가로로 반씩, narrow는 세로로 쌓는다 */}
        <nav
          className={cn(
            'flex w-full gap-spacing-md overflow-clip',
            isWide ? 'items-start' : 'flex-col',
          )}
        >
          {previousTitle !== undefined && (
            <PostNavCard
              direction="prev"
              device={device}
              title={previousTitle}
              {...(onPreviousOpen === undefined ? {} : getOpenableRowProps(onPreviousOpen))}
              className={isWide ? 'min-w-size-none flex-flex-fill' : 'w-full'}
            />
          )}
          {nextTitle !== undefined && (
            <PostNavCard
              direction="next"
              device={device}
              title={nextTitle}
              {...(onNextOpen === undefined ? {} : getOpenableRowProps(onNextOpen))}
              className={isWide ? 'min-w-size-none flex-flex-fill' : 'w-full'}
            />
          )}
        </nav>
      </article>
      {isWide && hasToc && (
        <Toc
          ref={tocRef}
          className="sticky top-spacing-5xl w-size-toc-width shrink-shrink-none self-start"
        >
          {tocItems}
        </Toc>
      )}
    </div>
  );
}

/**
 * 새 탭 페이지. 로고 자리 글자, 검색창, 최신 글 바로가기를 가운데에 쌓는다.
 * @param props 컴포넌트 속성
 * @param props.layout 피그마 Layout. wide는 넓은 창, narrow는 좁은 창의 배치다. 쓰는 곳이 창 내용 너비로 고른다
 * @param props.latestPosts 최신 글 바로가기
 * @param props.onLatestPostOpen 최신 글 바로가기를 눌렀을 때. 누른 글의 순서를 받는다
 * @param props.search 가운데 검색창 자리(피그마 `Chrome/NewTabSearch`). 주소창과 같이 동작하는 검색창을 쓰는 곳이 넣는다. 주지 않으면 닫힌 모습의 `ChromeNewTabSearch`다
 * @returns 새 탭 페이지
 */
function NewTabPage({
  layout,
  latestPosts,
  onLatestPostOpen,
  search = <ChromeNewTabSearch />,
}: ChromeNewTabPageProps & { layout: ChromePageLayout }): JSX.Element {
  const isWide = layout === 'wide';
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-spacing-2xl px-spacing-lg pb-spacing-2xl',
        isWide ? 'pt-spacing-5xl' : 'pt-spacing-4xl',
      )}
    >
      {/* 피그마 `top space` 배치 프레임. wide에서 로고 자리를 아래로 내린다 */}
      {isWide && <div className="h-size-chrome-page-top-space self-stretch" />}
      <p className={cn('text-color-black-89', isWide ? 'type-display' : 'type-title')}>
        {WORDMARK}
      </p>
      {search}
      <TileGrid
        align="center"
        className={isWide ? 'w-size-new-tab-grid-width' : 'w-full max-w-size-post-width'}
      >
        {latestPosts.map(
          /**
           * 최신 글 바로가기 하나를 그린다.
           * @param post 최신 글
           * @param index 순서
           * @returns PinnedTile
           */
          (post, index) => {
            return (
              <PinnedTile
                key={post.id ?? post.title}
                label={post.title}
                onClick={() => {
                  onLatestPostOpen?.(index);
                }}
                icon={<ImageAsset name="images/file-document" />}
              />
            );
          },
        )}
      </TileGrid>
    </div>
  );
}

/**
 * 검색 결과 페이지. 검색어와 개수 제목 아래에 글 목록을 둔다. narrow는 오른쪽 주소 글자를 뺀다.
 * @param props 컴포넌트 속성
 * @param props.layout 피그마 Layout. wide는 넓은 창, narrow는 좁은 창의 배치다. 쓰는 곳이 창 내용 너비로 고른다
 * @param props.query 검색어
 * @param props.results 제목에 검색어가 든 글 목록
 * @param props.onResultOpen 결과 글을 눌렀을 때(클릭·Enter·Space). 누른 글의 순서를 받는다
 * @returns 검색 결과 페이지
 */
function SearchResultsPage({
  layout,
  query,
  results,
  onResultOpen,
}: ChromeSearchResultsPageProps & { layout: ChromePageLayout }): JSX.Element {
  const isWide = layout === 'wide';
  return (
    <div
      className={cn(
        'flex flex-col items-center px-spacing-lg pb-spacing-2xl',
        isWide ? 'pt-spacing-5xl' : 'pt-spacing-2xl',
      )}
    >
      <section className="flex w-full max-w-size-post-width flex-col items-start gap-spacing-sm">
        <h1 className="w-full type-subtitle text-color-black-89">
          {`‘${query}’ 검색 결과 ${String(results.length)}개`}
        </h1>
        <div className="flex w-full flex-col gap-spacing-sm overflow-clip">
          {results.map(
            /**
             * 검색 결과 글 하나를 그린다.
             * @param result 검색 결과
             * @param index 순서
             * @returns ListItem
             */
            (result, index) => {
              return (
                <ListItem
                  key={result.id ?? result.title}
                  {...(onResultOpen === undefined
                    ? {}
                    : getOpenableRowProps(() => {
                        onResultOpen(index);
                      }))}
                  size="two-line"
                  title={result.title}
                  subtitle={result.date}
                  hasTrailing={isWide}
                  trailing={result.url}
                  icon={<ImageAsset name="images/file-document" />}
                  className="w-full"
                />
              );
            },
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * 페이지를 찾을 수 없음 화면. Chrome 오류 화면처럼 안내를 가운데에 둔다.
 * @param props 컴포넌트 속성
 * @param props.url 찾지 못한 주소
 * @param props.onReload 새로고침 버튼을 누르면 부른다
 * @returns 찾을 수 없음 화면
 */
function NotFoundPage({
  url,
  onReload: handleReload,
}: ChromeNotFoundPageProps & { layout: ChromePageLayout }): JSX.Element {
  return (
    <div className="flex flex-flex-fill items-center justify-center p-spacing-2xl">
      <EmptyState
        heading={`${WORDMARK} 페이지를 찾을 수 없음`}
        message={`다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: ${url}`}
        code="HTTP ERROR 404"
        onReload={handleReload}
        className="w-full max-w-size-empty-state-width"
      />
    </div>
  );
}

/**
 * Chrome 창의 본문(피그마 조립 `Chrome/Page`)을 그린다. 글, 새 탭, 검색 결과, 찾을 수 없음 화면 중 하나를
 * 넓은 창(wide)이나 좁은 창(narrow) 배치로 그린다. 글 본문은 자리 prop(`children`)으로 받는다.
 * 크기는 쓰는 쪽(`Window/Chrome`)이 정한다. 목차 이동·검색·새로고침 같은 동작은 기능을 구현할 때 붙인다.
 * 배율(`zoom`)은 본문에만 걸어 탭 표시줄과 도구 모음은 그대로다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:확대/축소]]
 * @param props 컴포넌트 속성
 * @param props.layout 피그마 Layout. wide는 넓은 창, narrow는 좁은 창의 배치다. 쓰는 곳이 창 내용 너비로 고른다
 * @param props.className 바깥 배치 클래스. 크기는 쓰는 곳(창)이 정한다
 * @param props.scrollRef 페이지를 스크롤하는 상자. 글 화면이 지금 읽는 위치를 잴 때 쓴다
 * @param props.zoom 페이지 본문 배율(1이 100%, [[Chrome:확대/축소]]). 주면 스크롤 상자 안의 본문만 키우거나 줄인다(스크롤 상자 크기는 그대로다). 주지 않으면 배율을 걸지 않는다(조립 스토리)
 * @param props.page 그릴 화면. post는 글 화면, new-tab은 새 탭 페이지, search-results는 검색 결과 페이지, not-found는 페이지를 찾을 수 없음 화면이다
 * @param props.cover (post) 커버 이미지(피그마 PostCover `image`). 있으면 제목 위에 그린다. 글 화면은 Notion 커버를 이미지 서버의 크기별 사본으로 넣는다([[Notion 이미지 제공]])
 * @param props.meta (post) 제목 위 작은 글자(폴더 경로와 작성일)
 * @param props.title (post) 글 제목
 * @param props.toc (post) 목차 항목. wide는 오른쪽에 펼치고, narrow는 제목 아래 접은 목차로 보인다. 비어 있으면 목차를 그리지 않는다
 * @param props.onTocItemSelect (post) 목차 항목을 눌렀을 때(클릭·Enter·Space). 누른 항목의 순서를 받는다
 * @param props.isTocExpanded (post) narrow에서 목차를 펼쳤는지. 펼치면 접은 목차 대신 항목 목록을 보인다
 * @param props.onTocToggle (post) narrow에서 목차를 누르면 펼치거나 접는다
 * @param props.children (post) 글 본문 자리. Notion 글을 바꾼 블록(문단, 제목, 코드 블록 등)을 넣는다. 블록 사이 간격은 이 화면이 정한다
 * @param props.previousTitle (post) 이전 글 제목. 없으면 카드를 그리지 않는다
 * @param props.nextTitle (post) 다음 글 제목. 없으면 카드를 그리지 않는다
 * @param props.onPreviousOpen (post) 이전 글 카드를 눌렀을 때(클릭·Enter·Space)
 * @param props.onNextOpen (post) 다음 글 카드를 눌렀을 때(클릭·Enter·Space)
 * @param props.latestPosts (new-tab) 최신 글 바로가기
 * @param props.onLatestPostOpen (new-tab) 최신 글 바로가기를 눌렀을 때. 누른 글의 순서를 받는다
 * @param props.search (new-tab) 가운데 검색창 자리(피그마 `Chrome/NewTabSearch`). 주소창과 같이 동작하는 검색창을 쓰는 곳이 넣는다. 주지 않으면 닫힌 모습의 `ChromeNewTabSearch`다
 * @param props.query (search-results) 검색어
 * @param props.results (search-results) 제목에 검색어가 든 글 목록
 * @param props.onResultOpen (search-results) 결과 글을 눌렀을 때(클릭·Enter·Space). 누른 글의 순서를 받는다
 * @param props.url (not-found) 찾지 못한 주소
 * @param props.onReload (not-found) 새로고침 버튼을 누르면 부른다
 */
export function ChromePage({
  layout = 'wide',
  className,
  scrollRef,
  zoom,
  ...pageProps
}: ChromePageProps): JSX.Element {
  let content: JSX.Element;
  switch (pageProps.page) {
    case 'post': {
      content = <PostPage {...pageProps} layout={layout} />;
      break;
    }
    case 'new-tab': {
      content = <NewTabPage {...pageProps} layout={layout} />;
      break;
    }
    case 'search-results': {
      content = <SearchResultsPage {...pageProps} layout={layout} />;
      break;
    }
    case 'not-found': {
      content = <NotFoundPage {...pageProps} layout={layout} />;
      break;
    }
  }
  return (
    // @codocs [[디자인 시스템:커서]]
    // data-web-page: 이 안의 누를 수 있는 요소는 손가락 커서다(디자인 시스템 reset.css).
    <div
      ref={scrollRef}
      data-web-page
      className={cn('flex flex-col overflow-y-auto bg-color-white', className)}
    >
      {zoom === undefined ? (
        content
      ) : (
        // 배율은 스크롤 상자 안의 본문에 건다. 스크롤 상자에 걸면 상자 크기까지 바뀌기 때문이다
        <div className="flex min-h-full w-full flex-col" style={{ zoom }}>
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * 누르면 여는 목록 줄의 속성. 버튼 역할이고 클릭·Enter·Space로 연다(Start 목록 줄과 같다).
 * @param open 여는 함수
 * @returns 줄 속성
 */
function getOpenableRowProps(open: () => void): {
  role: 'button';
  tabIndex: number;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
} {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: open,
    onKeyDown: handleKeyDown,
  };

  /**
   * Enter·Space로 연다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  }
}

/**
 * narrow 목차를 펼치거나 접는 속성. 접은 목차는 목차 전체, 펼친 목차는 머리(제목)가 버튼 역할이고
 * 클릭·Enter·Space로 펼치거나 접는다. 펼친 목차의 항목과 버튼이 겹치지 않게 머리만 버튼으로 둔다.
 * @param isExpanded 펼쳤는지
 * @param toggle 펼치거나 접는 함수
 * @returns 목차 속성
 */
function getTocToggleProps(isExpanded: boolean, toggle: () => void): ComponentProps<typeof Toc> {
  const buttonProps = { ...getOpenableRowProps(toggle), 'aria-expanded': isExpanded };
  return isExpanded ? { titleProps: buttonProps } : buttonProps;
}
