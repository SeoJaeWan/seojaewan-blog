import type { ComponentProps, JSX, KeyboardEvent, MouseEventHandler, ReactNode, Ref } from 'react';

import {
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

export type ChromePageLayout = 'wide' | 'narrow';

/** 목차 항목 하나 */
export type ChromePageTocItem = { label: string; active?: boolean };

/** 새 탭 최신 글 바로가기 하나. id는 같은 제목의 글을 구분한다 */
export type ChromePageLatestPost = { id?: string; title: string };

/** 검색 결과 글 하나. id는 같은 제목의 글을 구분한다 */
export type ChromePageSearchResult = { id?: string; title: string; date: string; url: string };

type ChromePageCommonProps = {
  /** 피그마 Layout. wide는 넓은 창, narrow는 좁은 창(모바일 폭)의 배치다 */
  layout?: ChromePageLayout;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(창)이 정한다 */
  className?: string;
  /** 페이지를 스크롤하는 상자. 글 화면이 지금 읽는 위치를 잴 때 쓴다 */
  scrollRef?: Ref<HTMLDivElement>;
  /**
   * 페이지 본문 배율(1이 100%, [[Chrome:확대/축소]]). 주면 스크롤 상자 안의 본문만 키우거나 줄인다(스크롤 상자 크기는 그대로다).
   * 주지 않으면 배율을 걸지 않는다(조립 스토리)
   */
  zoom?: number;
};

type ChromePostPageProps = {
  /** 피그마 Page=Post. 글 화면이다 */
  page: 'post';
  /**
   * 커버 이미지(피그마 PostCover `image`). 있으면 제목 위에 그린다. Notion 커버 제공([[Notion 이미지 제공]])은
   * 9단계라 그 전까지는 쓰는 곳이 넣는다
   */
  cover?: ReactNode;
  /** 제목 위 작은 글자(폴더 경로와 작성일) */
  meta: string;
  /** 글 제목 */
  title: string;
  /** 목차 항목. wide는 오른쪽에 펼치고, narrow는 제목 아래 접은 목차로 보인다. 비어 있으면 목차를 그리지 않는다 */
  toc: readonly ChromePageTocItem[];
  /** 목차 항목을 눌렀을 때(클릭·Enter·Space). 누른 항목의 순서를 받는다 */
  onTocItemSelect?: (index: number) => void;
  /** narrow에서 목차를 펼쳤는지. 펼치면 접은 목차 대신 항목 목록을 보인다 */
  isTocExpanded?: boolean;
  /** narrow에서 목차를 누르면 펼치거나 접는다 */
  onTocToggle?: () => void;
  /** 글 본문 자리. Notion 글을 바꾼 블록(문단, 제목, 코드 블록 등)을 넣는다. 블록 사이 간격은 이 화면이 정한다 */
  children?: ReactNode;
  /** 이전 글 제목. 없으면 카드를 그리지 않는다 */
  previousTitle?: string;
  /** 다음 글 제목. 없으면 카드를 그리지 않는다 */
  nextTitle?: string;
  /** 이전 글 카드를 눌렀을 때(클릭·Enter·Space) */
  onPreviousOpen?: () => void;
  /** 다음 글 카드를 눌렀을 때(클릭·Enter·Space) */
  onNextOpen?: () => void;
};

type ChromeNewTabPageProps = {
  /** 피그마 Page=New tab. 새 탭 페이지다 */
  page: 'new-tab';
  /** 최신 글 바로가기 */
  latestPosts: readonly ChromePageLatestPost[];
  /** 최신 글 바로가기를 눌렀을 때. 누른 글의 순서를 받는다 */
  onLatestPostOpen?: (index: number) => void;
  /**
   * 가운데 검색창 자리(피그마 `Chrome/NewTabSearch`). 주소창과 같이 동작하는 검색창을 쓰는 곳이 넣는다.
   * 주지 않으면 닫힌 모습의 `ChromeNewTabSearch`다
   */
  search?: ReactNode;
};

type ChromeSearchResultsPageProps = {
  /** 피그마 Page=Search results. 검색 결과 페이지다 */
  page: 'search-results';
  /** 검색어 */
  query: string;
  /** 제목에 검색어가 든 글 목록 */
  results: readonly ChromePageSearchResult[];
  /** 결과 글을 눌렀을 때(클릭·Enter·Space). 누른 글의 순서를 받는다 */
  onResultOpen?: (index: number) => void;
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

/**
 * 글 화면. wide는 글(최대 720)과 오른쪽 목차(220)를 가운데에 놓고, narrow는 글 머리 아래에 접은 목차를 둔다.
 * wide의 목차는 스크롤해도 오른쪽에 붙어 있다(sticky). 목차 항목이 없으면 목차를 그리지 않는다.
 * narrow의 접은 목차를 누르면 펼치고, 펼친 목차의 머리(제목)를 누르면 다시 접는다(클릭·Enter·Space).
 * @param props
 * @returns 글 화면
 */
function PostPage(props: ChromePostPageProps & { layout: ChromePageLayout }): JSX.Element {
  const {
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
  } = props;
  const isWide = layout === 'wide';
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
          active={item.active}
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
      className={isWide ? 'flex justify-center gap-48 px-16 pt-48' : 'flex flex-col px-16 pt-24'}
    >
      <article className="flex w-full max-w-720 min-w-0 flex-col items-start gap-16">
        {cover !== undefined && (
          // 피그마 `cover`는 wide에서 PostCover 높이 그대로(240), narrow에서 140으로 줄여 쓴다
          <PostCover image={cover} className={isWide ? 'w-full' : 'h-140 w-full'} />
        )}
        <p className="w-full type-caption text-text-fill-secondary">{meta}</p>
        <h1
          className={[
            'w-full text-text-fill-primary',
            isWide ? 'type-title' : 'type-subtitle',
          ].join(' ')}
        >
          {title}
        </h1>
        {!isWide && hasToc && (
          <Toc
            state={isTocExpanded ? 'expanded' : 'collapsed'}
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
          className={['flex w-full gap-12 overflow-clip', isWide ? 'items-start' : 'flex-col'].join(
            ' ',
          )}
        >
          {previousTitle !== undefined && (
            <PostNavCard
              direction="prev"
              device={device}
              title={previousTitle}
              {...(onPreviousOpen === undefined ? {} : getOpenableRowProps(onPreviousOpen))}
              className={isWide ? 'min-w-0 flex-1' : 'w-full'}
            />
          )}
          {nextTitle !== undefined && (
            <PostNavCard
              direction="next"
              device={device}
              title={nextTitle}
              {...(onNextOpen === undefined ? {} : getOpenableRowProps(onNextOpen))}
              className={isWide ? 'min-w-0 flex-1' : 'w-full'}
            />
          )}
        </nav>
      </article>
      {isWide && hasToc && (
        <Toc className="sticky top-48 w-220 shrink-0 self-start">{tocItems}</Toc>
      )}
    </div>
  );
}

/**
 * 새 탭 페이지. 로고 자리 글자, 검색창, 최신 글 바로가기를 가운데에 쌓는다.
 * @param props
 * @returns 새 탭 페이지
 */
function NewTabPage(props: ChromeNewTabPageProps & { layout: ChromePageLayout }): JSX.Element {
  const { layout, latestPosts, onLatestPostOpen, search = <ChromeNewTabSearch /> } = props;
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
      {search}
      <TileGrid align="center" className={isWide ? 'w-576' : 'w-full max-w-720'}>
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
                icon={
                  <ImageAsset name="images/file-document" className="size-full object-contain" />
                }
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
 * @param props
 * @returns 검색 결과 페이지
 */
function SearchResultsPage(
  props: ChromeSearchResultsPageProps & { layout: ChromePageLayout },
): JSX.Element {
  const { layout, query, results, onResultOpen } = props;
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
                  showTrailing={isWide}
                  trailing={result.url}
                  icon={
                    <ImageAsset name="images/file-document" className="size-full object-contain" />
                  }
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
 * 배율(`zoom`)은 본문에만 걸어 탭 표시줄과 도구 모음은 그대로다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:확대/축소]]
 * @param props
 */
export function ChromePage(props: ChromePageProps): JSX.Element {
  const { layout = 'wide', className, scrollRef, zoom } = props;
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
      ref={scrollRef}
      className={['flex flex-col overflow-y-auto bg-chrome-page-fill', className]
        .filter(Boolean)
        .join(' ')}
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
 * 버튼 역할에 맞지 않는 `aria-selected`(ListItem이 붙인다)는 뺀다.
 * @param open 여는 함수
 * @returns 줄 속성
 */
function getOpenableRowProps(open: () => void): {
  role: 'button';
  tabIndex: number;
  'aria-selected': undefined;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
} {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-selected': undefined,
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
