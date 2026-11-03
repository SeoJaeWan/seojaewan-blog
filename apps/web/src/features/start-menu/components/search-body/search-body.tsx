import type { JSX } from 'react';

import {
  BestMatchCard,
  cn,
  ListGroup,
  MenuItem,
  ScrollArea,
  SearchResults,
} from '@seojaewan/design-system';

import { renderItemIcon } from '@/features/start-menu/components/item-icon/item-icon';
import { ItemListRow } from '@/features/start-menu/components/item-list-row/item-list-row';
import type {
  SearchItem,
  SearchItemKind,
  SearchRecommendedPost,
  SearchResultGroups,
  SearchResultItem,
} from '@/features/start-menu/utils/start-items/start-items';

export type SearchBodyDevice = 'desktop' | 'mobile';

type SearchBodyCommonProps = {
  /** 피그마 Device. 결과 화면에서 고른 항목의 카드를 옆(desktop)이나 위(mobile)에 둔다 */
  device?: SearchBodyDevice;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(검색 패널, Start 메뉴)이 정한다 */
  className?: string;
  /**
   * 내용 둘레 여백 클래스. 스크롤하는 화면은 ScrollArea의 내용 칸(스크롤되는 칸)에, 나머지는 내용을 담는 바탕에 준다.
   * 본문이 패널 폭을 채우고 여백을 안에서 줘야 스크롤바가 본문 가장자리에 놓이기 때문이다
   */
  contentClassName?: string;
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
 * 검색 패널 안의 본문(피그마 조립 `Search/Body`)을 그린다. 입력 전 최근·추천 목록, 검색 결과, 결과 없음 안내 중 하나다.
 * 입력 전 화면은 넘치면 ScrollArea로 스크롤한다. 결과 화면은 SearchResults에 고른 항목 카드의 동작(열기, 글과 외부 링크는 링크 복사)과 종류별 결과 묶음을 넣는다.
 * 항목 줄과 카드의 동작은 `onItemOpen`·`onCopyLink`로 알리고, 열거나 복사하는 일은 쓰는 곳이 한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[검색:입력 전 화면]]
 * @param props
 */
export function SearchBody(props: SearchBodyProps): JSX.Element {
  const { device = 'desktop', className, contentClassName } = props;
  switch (props.view) {
    case 'before-typing':
      return (
        <ScrollArea className={className} contentClassName={contentClassName}>
          <div className="flex w-full shrink-shrink-none flex-col items-start gap-spacing-2xs">
            {props.recent.length > 0 && (
              <ListGroup label="최근" className="w-full shrink-shrink-none">
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
            <ListGroup label="추천" className="w-full shrink-shrink-none">
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
          contentClassName={contentClassName}
          onItemOpen={props.onItemOpen}
          onCopyLink={props.onCopyLink}
        />
      );
    case 'no-results':
      return (
        <div className={cn('flex items-center justify-center', contentClassName, className)}>
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
  /** 내용 둘레 여백 클래스. 모바일은 스크롤되는 칸에, 데스크톱은 SearchResults를 담는 바탕에 준다 */
  contentClassName?: string;
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
  const { device, results, className, contentClassName } = props;
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
  const searchResults = (
    <SearchResults
      device={device}
      className={device === 'mobile' ? 'w-full' : 'min-h-size-none w-full flex-flex-fill'}
      card={
        <BestMatchCard
          icon={renderItemIcon({ kind: cardItem.kind })}
          title={cardItem.title}
          meta={cardItem.date === undefined ? cardKindLabel : `${cardKindLabel} · ${cardItem.date}`}
          className={device === 'mobile' ? 'w-full' : 'shrink-shrink-none'}
        >
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
        </BestMatchCard>
      }
    >
      <ListGroup label="최고 일치" className="w-full shrink-shrink-none">
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
            <ListGroup
              key={group.kind}
              label={kindLabels[group.kind]}
              className="w-full shrink-shrink-none"
            >
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
  // 모바일 SearchResults는 높이가 내용에 맞으므로, 넘치면 카드와 목록을 함께 스크롤하도록 ScrollArea로 감싼다.
  if (device === 'mobile') {
    return (
      <ScrollArea
        className={cn('size-full rounded-radius-control', className)}
        contentClassName={contentClassName}
      >
        {searchResults}
      </ScrollArea>
    );
  }
  // 데스크톱 SearchResults는 바탕을 채운다. 여백은 담는 바탕이 갖는다.
  return <div className={cn('flex flex-col', contentClassName, className)}>{searchResults}</div>;
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
