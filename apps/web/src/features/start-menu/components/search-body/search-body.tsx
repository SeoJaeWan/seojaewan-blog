import type { JSX } from 'react';

import { ListGroup, MenuItem, ScrollArea, SearchResults } from '@seojaewan/design-system';

import { renderItemIcon } from '@/features/start-menu/components/item-icon/item-icon';
import { ItemListRow } from '@/features/start-menu/components/item-list-row/item-list-row';

/** 검색 대상의 종류. 폴더, 글, 외부 링크다 */
export type SearchItemKind = 'folder' | 'post' | 'link';

/** 검색 패널에 보이는 항목 하나 */
export type SearchItem = {
  /** 작업 공간 항목 id. 목록의 key이고, 열거나 링크를 복사할 때 어느 항목인지 알린다 */
  id: string;
  /** 항목 종류. 아이콘과 종류 이름을 정한다 */
  kind: SearchItemKind;
  /** 항목 이름(글은 제목) */
  title: string;
};

/** 추천 글 하나 */
export type SearchRecommendedPost = {
  /** 글 항목 id */
  id: string;
  /** 글 제목 */
  title: string;
  /** 글 날짜(예: `2026-10-20`) */
  date: string;
};

/** 결과 항목 하나. 글이면 카드에 날짜를 함께 보인다 */
export type SearchResultItem = SearchItem & {
  /** 글 날짜. 카드의 부가 정보에 종류 이름과 함께 보인다 */
  date?: string;
};

/** 검색 결과. 최고 일치 하나와 나머지 결과를 종류별로 묶은 것이다 */
export type SearchResultGroups = {
  /** 결과 목록 맨 위의 최고 일치. 처음에 카드가 보이는 항목이다 */
  bestMatch: SearchResultItem;
  /** 나머지 폴더 결과 */
  folders: readonly SearchResultItem[];
  /** 나머지 글 결과 */
  posts: readonly SearchResultItem[];
  /** 나머지 외부 링크 결과 */
  links: readonly SearchResultItem[];
};

export type SearchBodyDevice = 'desktop' | 'mobile';

type SearchBodyCommonProps = {
  /** 피그마 Device. 결과 화면에서 고른 항목의 카드를 옆(desktop)이나 위(mobile)에 둔다 */
  device?: SearchBodyDevice;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(검색 패널, Start 메뉴)이 정한다 */
  className?: string;
  /** 항목 줄(최근, 추천, 결과)이나 카드의 `열기`를 눌렀을 때 그 항목의 id로 부른다. 항목을 여는 일은 쓰는 곳이 한다 */
  onItemOpen?: (id: string) => void;
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
        /** 피그마 View=Results. 고른 항목의 카드(처음에는 최고 일치)와 종류별 결과를 보인다 */
        view: 'results';
        /** 검색 결과 */
        results: SearchResultGroups;
        /** 고른 항목의 id. 그 줄에 선택 바탕을 깐다. 주지 않으면 최고 일치다 */
        selectedId?: string;
        /** 카드의 `링크 복사`를 눌렀을 때 그 항목의 id로 부른다 */
        onCopyLink?: (id: string) => void;
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
 * 입력 전 화면은 넘치면 ScrollArea로 스크롤한다. 결과 화면은 SearchResults에 고른 항목 카드의 동작(열기, 글과 외부 링크는 링크 복사)과 종류별 결과 묶음을 넣는다.
 * 항목 줄과 카드의 동작은 `onItemOpen`·`onCopyLink`로 알리고, 열거나 복사하는 일은 쓰는 곳이 한다.
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
        <ScrollArea className={className}>
          <div className="flex w-full shrink-0 flex-col items-start gap-2">
            {props.recent.length > 0 && (
              <ListGroup label="최근" className="w-full shrink-0">
                {props.recent.map(
                  /**
                   * 최근 항목 한 줄을 그린다.
                   * @param item 최근 항목
                   * @returns ItemListRow
                   */
                  (item) => (
                    <ItemListRow
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      icon={renderItemIcon({ kind: item.kind })}
                      className="w-full"
                      onOpen={props.onItemOpen}
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
                 * @returns ItemListRow
                 */
                (post) => (
                  <ItemListRow
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    subtitle={post.date}
                    icon={renderItemIcon({ kind: 'post' })}
                    className="w-full"
                    onOpen={props.onItemOpen}
                  />
                ),
              )}
            </ListGroup>
          </div>
        </ScrollArea>
      );
    case 'results':
      return (
        <SearchBodyResults
          device={device}
          results={props.results}
          selectedId={props.selectedId}
          className={className}
          onItemOpen={props.onItemOpen}
          onCopyLink={props.onCopyLink}
        />
      );
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
  /** 고른 항목의 id. 주지 않으면 최고 일치다 */
  selectedId?: string;
  /** 바깥 배치 클래스 */
  className?: string;
  /** 항목 줄이나 카드의 `열기`를 눌렀을 때 부른다 */
  onItemOpen?: (id: string) => void;
  /** 카드의 `링크 복사`를 눌렀을 때 부른다 */
  onCopyLink?: (id: string) => void;
};

/**
 * 결과 화면을 그린다. 최고 일치는 맨 위 묶음에 보이고, 나머지 결과는 있는 종류만 묶어 보인다.
 * 카드는 목록에서 고른 항목을 따라가고(처음에는 최고 일치), 내용과 동작은 그 항목의 종류에 맞춘다.
 * @codocs [[검색:결과 화면]]
 * @param props
 */
function SearchBodyResults(props: SearchBodyResultsProps): JSX.Element {
  const { device, results, className } = props;
  const { bestMatch } = results;
  const cardItem = findResultItem(results, props.selectedId) ?? bestMatch;
  const selectedId = cardItem.id;
  const cardKindLabel = kindLabels[cardItem.kind];
  // 링크 복사는 주소가 있는 글과 외부 링크에만 둔다(폴더는 열기만).
  const canCopyLink = cardItem.kind !== 'folder';

  /** 카드의 `열기`를 누르면 카드의 항목을 연다고 알린다. */
  function handleOpenCardItem(): void {
    props.onItemOpen?.(cardItem.id);
  }

  /** 카드의 `링크 복사`를 누르면 카드의 항목의 링크를 복사한다고 알린다. */
  function handleCopyCardItemLink(): void {
    props.onCopyLink?.(cardItem.id);
  }

  const groups = [
    { kind: 'folder', items: results.folders },
    { kind: 'post', items: results.posts },
    { kind: 'link', items: results.links },
  ] as const;
  return (
    <SearchResults
      device={device}
      className={className}
      icon={renderItemIcon({ kind: cardItem.kind })}
      title={cardItem.title}
      meta={cardItem.date === undefined ? cardKindLabel : `${cardKindLabel} · ${cardItem.date}`}
      actions={
        <div className="flex flex-col items-start gap-8">
          <MenuItem
            standalone
            label="열기"
            icon="icons/ic_fluent_open_20_regular.svg"
            onClick={handleOpenCardItem}
          />
          {canCopyLink && (
            <MenuItem
              standalone
              label="링크 복사"
              icon="icons/ic_fluent_link_20_regular.svg"
              onClick={handleCopyCardItemLink}
            />
          )}
        </div>
      }
    >
      <ListGroup label="최고 일치" className="w-full shrink-0">
        <ItemListRow
          id={bestMatch.id}
          isSelected={selectedId === bestMatch.id}
          title={bestMatch.title}
          subtitle={kindLabels[bestMatch.kind]}
          icon={renderItemIcon({ kind: bestMatch.kind })}
          className="w-full"
          onOpen={props.onItemOpen}
        />
      </ListGroup>
      {groups
        .filter((group) => group.items.length > 0)
        .map(
          /**
           * 종류 하나의 결과 묶음을 그린다.
           * @param group 종류와 결과 항목
           * @returns ListGroup
           */
          (group) => (
            <ListGroup key={group.kind} label={kindLabels[group.kind]} className="w-full shrink-0">
              {group.items.map(
                /**
                 * 결과 한 줄을 그린다.
                 * @param item 결과 항목
                 * @returns ItemListRow
                 */
                (item) => (
                  <ItemListRow
                    key={item.id}
                    id={item.id}
                    isSelected={selectedId === item.id}
                    title={item.title}
                    icon={renderItemIcon({ kind: group.kind })}
                    className="w-full"
                    onOpen={props.onItemOpen}
                  />
                ),
              )}
            </ListGroup>
          ),
        )}
    </SearchResults>
  );
}

/**
 * 결과 목록에서 id로 항목을 찾는다.
 * @param results 검색 결과
 * @param id 찾을 항목 id. 없으면 찾지 않는다
 * @returns 찾은 항목. 없으면 undefined
 */
function findResultItem(
  results: SearchResultGroups,
  id: string | undefined,
): SearchResultItem | undefined {
  if (id === undefined) {
    return undefined;
  }
  return [results.bestMatch, ...results.folders, ...results.posts, ...results.links].find(
    (item) => item.id === id,
  );
}
