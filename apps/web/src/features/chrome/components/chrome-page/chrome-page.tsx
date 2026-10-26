import type { JSX, MouseEventHandler, ReactNode } from 'react';

import {
  EmptyState,
  ImageAsset,
  ListItem,
  PinnedTile,
  PostNavCard,
  SearchBox,
  Separator,
  TileGrid,
  Toc,
  TocItem,
} from '@seojaewan/design-system';

export type ChromePageLayout = 'wide' | 'narrow';

/** 목차 항목 하나 */
export type ChromePageTocItem = { label: string; active?: boolean };

/** 새 탭 최신 글 바로가기 하나 */
export type ChromePageLatestPost = { title: string };

/** 검색 결과 글 하나 */
export type ChromePageSearchResult = { title: string; date: string; url: string };

type ChromePageCommonProps = {
  /** 피그마 Layout. wide는 넓은 창, narrow는 좁은 창(모바일 폭)의 배치다 */
  layout?: ChromePageLayout;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(창)이 정한다 */
  className?: string;
};

type ChromePostPageProps = {
  /** 피그마 Page=Post. 글 화면이다 */
  page: 'post';
  /** 제목 위 작은 글자(폴더 경로와 작성일) */
  meta: string;
  /** 글 제목 */
  title: string;
  /** 목차 항목. wide는 오른쪽에 펼치고, narrow는 제목 아래 접은 목차로 보인다 */
  toc: readonly ChromePageTocItem[];
  /** 글 본문 자리. Notion 글을 바꾼 블록(문단, 제목, 코드 블록 등)을 넣는다. 블록 사이 간격은 이 화면이 정한다 */
  children?: ReactNode;
  /** 이전 글 제목. 없으면 카드를 그리지 않는다 */
  previousTitle?: string;
  /** 다음 글 제목. 없으면 카드를 그리지 않는다 */
  nextTitle?: string;
};

type ChromeNewTabPageProps = {
  /** 피그마 Page=New tab. 새 탭 페이지다 */
  page: 'new-tab';
  /** 최신 글 바로가기 */
  latestPosts: readonly ChromePageLatestPost[];
};

type ChromeSearchResultsPageProps = {
  /** 피그마 Page=Search results. 검색 결과 페이지다 */
  page: 'search-results';
  /** 검색어 */
  query: string;
  /** 제목에 검색어가 든 글 목록 */
  results: readonly ChromePageSearchResult[];
};

type ChromeNotFoundPageProps = {
  /** 피그마 Page=Not found. 페이지를 찾을 수 없음 화면이다 */
  page: 'not-found';
  /** 찾지 못한 주소 */
  url: string;
  /** 새로고침 버튼을 누르면 부른다 */
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
const NEW_TAB_SEARCH_PLACEHOLDER = '글 검색 또는 URL 입력';

/**
 * 글 화면. wide는 글(최대 720)과 오른쪽 목차(220)를 가운데에 놓고, narrow는 글 머리 아래에 접은 목차를 둔다.
 * @param props
 * @returns 글 화면
 */
function PostPage(props: ChromePostPageProps & { layout: ChromePageLayout }): JSX.Element {
  const { layout, meta, title, toc, children, previousTitle, nextTitle } = props;
  const isWide = layout === 'wide';
  const tocItems = toc.map(
    /**
     * 목차 항목 하나를 그린다.
     * @param item 목차 항목
     * @returns TocItem
     */
    (item) => <TocItem key={item.label} label={item.label} active={item.active} />,
  );
  const device = isWide ? 'desktop' : 'mobile';
  return (
    <div
      className={isWide ? 'flex justify-center gap-48 px-16 pt-48' : 'flex flex-col px-16 pt-24'}
    >
      <article className="flex w-full max-w-720 min-w-0 flex-col items-start gap-16">
        <p className="w-full type-caption text-text-fill-secondary">{meta}</p>
        <h1
          className={[
            'w-full text-text-fill-primary',
            isWide ? 'type-title' : 'type-subtitle',
          ].join(' ')}
        >
          {title}
        </h1>
        {!isWide && <Toc state="collapsed" className="w-full" />}
        {children}
        <Separator className="w-full" />
        {/* 피그마 `prev / next` 배치 프레임이다. wide는 가로로 반씩, narrow는 세로로 쌓는다 */}
        <nav
          className={['flex w-full gap-12 overflow-clip', isWide ? 'items-start' : 'flex-col'].join(
            ' ',
          )}
        >
          {previousTitle !== undefined && (
            <PostNavCard
              direction="prev"
              device={device}
              title={previousTitle}
              className={isWide ? 'min-w-0 flex-1' : 'w-full'}
            />
          )}
          {nextTitle !== undefined && (
            <PostNavCard
              direction="next"
              device={device}
              title={nextTitle}
              className={isWide ? 'min-w-0 flex-1' : 'w-full'}
            />
          )}
        </nav>
      </article>
      {isWide && <Toc className="w-220 shrink-0">{tocItems}</Toc>}
    </div>
  );
}

/**
 * 새 탭 페이지. 로고 자리 글자, 검색창, 최신 글 바로가기를 가운데에 쌓는다.
 * @param props
 * @returns 새 탭 페이지
 */
function NewTabPage(props: ChromeNewTabPageProps & { layout: ChromePageLayout }): JSX.Element {
  const { layout, latestPosts } = props;
  const isWide = layout === 'wide';
  return (
    <div
      className={['flex flex-col items-center gap-24 px-16', isWide ? 'pt-48' : 'pt-40'].join(' ')}
    >
      {/* 피그마 `top space` 배치 프레임. wide에서 로고 자리를 아래로 내린다 */}
      {isWide && <div className="h-96 self-stretch" />}
      <p className={['text-text-fill-primary', isWide ? 'type-display' : 'type-title'].join(' ')}>
        {WORDMARK}
      </p>
      <SearchBox
        appearance="pill"
        placeholder={NEW_TAB_SEARCH_PLACEHOLDER}
        aria-label={NEW_TAB_SEARCH_PLACEHOLDER}
        className="w-320"
      />
      <TileGrid align="center" className={isWide ? 'w-576' : 'w-full max-w-720'}>
        {latestPosts.map(
          /**
           * 최신 글 바로가기 하나를 그린다.
           * @param post 최신 글
           * @returns PinnedTile
           */
          (post) => (
            <PinnedTile
              key={post.title}
              label={post.title}
              icon={<ImageAsset name="images/file-document" className="size-full object-contain" />}
            />
          ),
        )}
      </TileGrid>
    </div>
  );
}

/**
 * 검색 결과 페이지. 검색어와 개수 제목 아래에 글 목록을 둔다. narrow는 오른쪽 주소 글자를 뺀다.
 * @param props
 * @returns 검색 결과 페이지
 */
function SearchResultsPage(
  props: ChromeSearchResultsPageProps & { layout: ChromePageLayout },
): JSX.Element {
  const { layout, query, results } = props;
  const isWide = layout === 'wide';
  return (
    <div className={['flex flex-col items-center px-16', isWide ? 'pt-48' : 'pt-24'].join(' ')}>
      <section className="flex w-full max-w-720 flex-col items-start gap-8">
        <h1 className="w-full type-subtitle text-text-fill-primary">
          {`‘${query}’ 검색 결과 ${String(results.length)}개`}
        </h1>
        <div className="flex w-full flex-col gap-8 overflow-clip">
          {results.map(
            /**
             * 검색 결과 글 하나를 그린다.
             * @param result 검색 결과
             * @returns ListItem
             */
            (result) => (
              <ListItem
                key={result.title}
                size="two-line"
                title={result.title}
                subtitle={result.date}
                showTrailing={isWide}
                trailing={result.url}
                icon={
                  <ImageAsset name="images/file-document" className="size-full object-contain" />
                }
                className="w-full"
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * 페이지를 찾을 수 없음 화면. Chrome 오류 화면처럼 안내를 가운데에 둔다.
 * @param props
 * @returns 찾을 수 없음 화면
 */
function NotFoundPage(props: ChromeNotFoundPageProps & { layout: ChromePageLayout }): JSX.Element {
  const { url, onReload: handleReload } = props;
  return (
    <div className="flex flex-1 items-center justify-center px-24">
      <EmptyState
        heading={`${WORDMARK} 페이지를 찾을 수 없음`}
        message={`다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: ${url}`}
        code="HTTP ERROR 404"
        onReload={handleReload}
        className="w-full max-w-600"
      />
    </div>
  );
}

/**
 * Chrome 창의 본문(피그마 조립 `Chrome/Page`)을 그린다. 글, 새 탭, 검색 결과, 찾을 수 없음 화면 중 하나를
 * 넓은 창(wide)이나 좁은 창(narrow) 배치로 그린다. 글 본문은 자리 prop(`children`)으로 받는다.
 * 크기는 쓰는 쪽(`Window/Chrome`)이 정한다. 목차 이동·검색·새로고침 같은 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @param props
 */
export function ChromePage(props: ChromePageProps): JSX.Element {
  const { layout = 'wide', className } = props;
  let content: JSX.Element;
  switch (props.page) {
    case 'post': {
      content = <PostPage {...props} layout={layout} />;
      break;
    }
    case 'new-tab': {
      content = <NewTabPage {...props} layout={layout} />;
      break;
    }
    case 'search-results': {
      content = <SearchResultsPage {...props} layout={layout} />;
      break;
    }
    case 'not-found': {
      content = <NotFoundPage {...props} layout={layout} />;
      break;
    }
  }
  return (
    <div
      className={['flex flex-col overflow-y-auto bg-chrome-page-fill', className]
        .filter(Boolean)
        .join(' ')}
    >
      {content}
    </div>
  );
}
