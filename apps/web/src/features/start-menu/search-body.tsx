import type { JSX } from 'react';

import { ListGroup, ListItem, MenuItem, SearchResults } from '@seojaewan/design-system';

import { renderItemIcon } from './item-icon';

/** 검색 대상의 종류. 폴더, 글, 외부 링크다 */
export type SearchItemKind = 'folder' | 'post' | 'link';

/** 검색 패널에 보이는 항목 하나 */
export type SearchItem = {
  /** 항목 종류. 아이콘과 종류 이름을 정한다 */
  kind: SearchItemKind;
  /** 항목 이름(글은 제목) */
  title: string;
};

/** 추천 글 하나 */
export type SearchRecommendedPost = {
  /** 글 제목 */
  title: string;
  /** 글 날짜(예: `2026-10-20`) */
  date: string;
};

/** 최고 일치 항목. 글이면 날짜를 함께 보인다 */
export type SearchBestMatch = SearchItem & {
  /** 글 날짜. 카드의 부가 정보에 종류 이름과 함께 보인다 */
  date?: string;
};

/** 검색 결과. 최고 일치 하나와 나머지 결과를 종류별로 묶은 것이다 */
export type SearchResultGroups = {
  /** 맨 위에 크게 보이는 최고 일치 */
  bestMatch: SearchBestMatch;
  /** 나머지 폴더 결과 */
  folders: readonly string[];
  /** 나머지 글 결과 */
  posts: readonly string[];
  /** 나머지 외부 링크 결과 */
  links: readonly string[];
};

export type SearchBodyDevice = 'desktop' | 'mobile';

type SearchBodyCommonProps = {
  /** 피그마 Device. 결과 화면에서 최고 일치 카드를 옆(desktop)이나 위(mobile)에 둔다 */
  device?: SearchBodyDevice;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(검색 패널, Start 메뉴)이 정한다 */
  className?: string;
};

type SearchBodyProps = SearchBodyCommonProps &
  (
    | {
        /** 피그마 View=Before typing. 최근 항목과 추천 글을 보인다 */
        view: 'before-typing';
        /** 최근에 연 항목. 없으면 최근 묶음을 그리지 않는다 */
        recent: readonly SearchItem[];
        /** 추천 글 */
        recommended: readonly SearchRecommendedPost[];
      }
    | {
        /** 피그마 View=Results. 최고 일치 카드와 종류별 결과를 보인다 */
        view: 'results';
        /** 검색 결과 */
        results: SearchResultGroups;
      }
    | {
        /** 피그마 View=No results. "검색 결과 없음"을 안내한다 */
        view: 'no-results';
      }
  );

// 종류별 이름이다. 결과 묶음 머리글과 최고 일치의 부제·부가 정보에 쓴다.
const kindLabels = {
  folder: '폴더',
  post: '글',
  link: '외부 링크',
} as const satisfies Record<SearchItemKind, string>;

/**
 * 기본 클래스와 바깥 배치 클래스를 잇는다.
 * @param base 기본 클래스
 * @param className 바깥 배치 클래스
 * @returns 이은 클래스
 */
function joinClassNames(base: string, className: string | undefined): string {
  return className === undefined ? base : `${base} ${className}`;
}

/**
 * 검색 패널 안의 본문(피그마 조립 `Search/Body`)을 그린다. 입력 전 최근·추천 목록, 검색 결과, 결과 없음 안내 중 하나다.
 * 결과 화면은 SearchResults에 최고 일치 카드의 동작(열기, 글과 외부 링크는 링크 복사)과 종류별 결과 묶음을 넣는다.
 * 고르기·열기·링크 복사 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[검색:입력 전 화면]]
 * @param props
 */
export function SearchBody(props: SearchBodyProps): JSX.Element {
  const { device = 'desktop', className } = props;
  switch (props.view) {
    case 'before-typing':
      return (
        <div className={joinClassNames('flex flex-col items-start gap-2 overflow-clip', className)}>
          {props.recent.length > 0 && (
            <ListGroup label="최근" className="w-full shrink-0">
              {props.recent.map(
                /**
                 * 최근 항목 한 줄을 그린다.
                 * @param item 최근 항목
                 * @returns ListItem
                 */
                (item) => (
                  <ListItem
                    key={`${item.kind}-${item.title}`}
                    title={item.title}
                    icon={renderItemIcon({ kind: item.kind })}
                    className="w-full"
                  />
                ),
              )}
            </ListGroup>
          )}
          <ListGroup label="추천" className="w-full shrink-0">
            {props.recommended.map(
              /**
               * 추천 글 한 줄을 그린다.
               * @param post 추천 글
               * @returns ListItem
               */
              (post) => (
                <ListItem
                  key={post.title}
                  size="two-line"
                  title={post.title}
                  subtitle={post.date}
                  icon={renderItemIcon({ kind: 'post' })}
                  className="w-full"
                />
              ),
            )}
          </ListGroup>
        </div>
      );
    case 'results':
      return <SearchBodyResults device={device} results={props.results} className={className} />;
    case 'no-results':
      return (
        <div className={joinClassNames('flex items-center justify-center', className)}>
          <p className="type-body whitespace-nowrap text-text-fill-secondary">검색 결과 없음</p>
        </div>
      );
  }
}

type SearchBodyResultsProps = {
  /** 피그마 Device */
  device: SearchBodyDevice;
  /** 검색 결과 */
  results: SearchResultGroups;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 결과 화면을 그린다. 최고 일치는 카드와 맨 위 묶음에 함께 보이고, 나머지 결과는 있는 종류만 묶어 보인다.
 * @param props
 */
function SearchBodyResults(props: SearchBodyResultsProps): JSX.Element {
  const { device, results, className } = props;
  const { bestMatch } = results;
  const kindLabel = kindLabels[bestMatch.kind];
  // 링크 복사는 주소가 있는 글과 외부 링크에만 둔다(폴더는 열기만).
  const canCopyLink = bestMatch.kind !== 'folder';
  const groups = [
    { kind: 'folder', titles: results.folders },
    { kind: 'post', titles: results.posts },
    { kind: 'link', titles: results.links },
  ] as const;
  return (
    <SearchResults
      device={device}
      className={className}
      icon={renderItemIcon({ kind: bestMatch.kind })}
      title={bestMatch.title}
      meta={bestMatch.date === undefined ? kindLabel : `${kindLabel} · ${bestMatch.date}`}
      actions={
        <div className="flex flex-col items-start gap-8">
          <MenuItem standalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
          {canCopyLink && (
            <MenuItem standalone label="링크 복사" icon="icons/ic_fluent_link_20_regular.svg" />
          )}
        </div>
      }
    >
      <ListGroup label="최고 일치" className="w-full shrink-0">
        <ListItem
          selected
          size="two-line"
          title={bestMatch.title}
          subtitle={kindLabel}
          icon={renderItemIcon({ kind: bestMatch.kind })}
          className="w-full"
        />
      </ListGroup>
      {groups
        .filter((group) => group.titles.length > 0)
        .map(
          /**
           * 종류 하나의 결과 묶음을 그린다.
           * @param group 종류와 결과 이름
           * @returns ListGroup
           */
          (group) => (
            <ListGroup key={group.kind} label={kindLabels[group.kind]} className="w-full shrink-0">
              {group.titles.map(
                /**
                 * 결과 한 줄을 그린다.
                 * @param title 항목 이름
                 * @returns ListItem
                 */
                (title) => (
                  <ListItem
                    key={title}
                    title={title}
                    icon={renderItemIcon({ kind: group.kind })}
                    className="w-full"
                  />
                ),
              )}
            </ListGroup>
          ),
        )}
    </SearchResults>
  );
}
