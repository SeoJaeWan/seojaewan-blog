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
  device?: SearchBodyDevice;
  contentClassName?: string;
  onItemOpen?: (id: string) => void;
};

type SearchBodyProps = SearchBodyCommonProps &
  (
    | {
        view: 'before-typing';
        recent: readonly SearchItem[];
        recommended: readonly SearchRecommendedPost[];
      }
    | {
        view: 'results';
        results: SearchResultGroups;
        selectedId?: string;
        onCopyLink?: (id: string) => void;
      }
    | {
        view: 'no-results';
      }
  );

// 종류별 이름이다. 결과 묶음 머리글과 최고 일치의 부제·부가 정보에 쓴다.
const kindLabels = {
  folder: '폴더',
  post: '글',
  link: '외부 링크',
} as const satisfies Record<SearchItemKind, string>;

// 기기별 내용 좌우 여백이다(데스크톱 32, 모바일 16). 본문은 패널 폭을 채우고, 스크롤하는 화면은 ScrollArea의 내용 칸(스크롤되는 칸)에,
// 나머지는 내용을 담는 바탕에 이 여백을 준다. 그래서 스크롤바는 ScrollArea 기본 자리(본문 오른쪽 가장자리)에 놓인다.
const contentInsetClassNames = {
  desktop: 'px-spacing-3xl',
  mobile: 'px-spacing-lg',
} as const satisfies Record<SearchBodyDevice, string>;

/**
 * 검색 패널 안의 본문(피그마 조립 `Search/Body`)을 그린다. 입력 전 최근·추천 목록, 검색 결과, 결과 없음 안내 중 하나다.
 * 본문은 패널 폭을 채우고 내용 좌우 여백은 안에서 준다. 입력 전 화면은 넘치면 ScrollArea로 스크롤한다. 결과 화면은 SearchResults에 고른 항목 카드의 동작(열기, 글과 외부 링크는 링크 복사)과 종류별 결과 묶음을 넣는다.
 * 항목 줄과 카드의 동작은 `onItemOpen`·`onCopyLink`로 알리고, 열거나 복사하는 일은 쓰는 곳이 한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[검색:입력 전 화면]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 결과 화면에서 고른 항목의 카드를 옆(desktop)이나 위(mobile)에 둔다
 * @param props.contentClassName 기기별 좌우 여백에 더할 내용 둘레 여백 클래스(예: Start 결과 화면의 위아래 24). 좌우 여백과 같은 칸에 준다
 * @param props.onItemOpen 항목 줄(최근, 추천, 결과)이나 카드의 `열기`를 눌렀을 때 그 항목의 id로 부른다. 항목을 여는 일은 쓰는 곳이 한다
 * @param props.view 보일 화면. before-typing은 최근 항목과 추천 글(피그마 View=Before typing), results는 고른 항목의 카드(처음에는 최고 일치)와 종류별 결과(View=Results), no-results는 "검색 결과 없음" 안내(View=No results)다
 * @param props.recent (before-typing) 최근에 연 항목. 없으면 최근 묶음을 그리지 않는다
 * @param props.recommended (before-typing) 추천 글
 * @param props.results (results) 검색 결과
 * @param props.selectedId (results) 고른 항목의 id. 그 줄에 선택 바탕을 깐다. 주지 않으면 최고 일치다
 * @param props.onCopyLink (results) 카드의 `링크 복사`를 눌렀을 때 그 항목의 id로 부른다
 */
export function SearchBody({
  device = 'desktop',
  contentClassName: extraContentClassName,
  onItemOpen: handleItemOpen,
  ...viewProps
}: SearchBodyProps): JSX.Element {
  const contentClassName = cn(contentInsetClassNames[device], extraContentClassName);
  switch (viewProps.view) {
    case 'before-typing':
      return (
        <ScrollArea contentClassName={contentClassName}>
          <div className="flex w-full shrink-shrink-none flex-col items-start gap-spacing-2xs">
            {viewProps.recent.length > 0 && (
              <ListGroup label="최근" className="w-full shrink-shrink-none">
                {viewProps.recent.map(
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
                      onOpen={handleItemOpen}
                    />
                  ),
                )}
              </ListGroup>
            )}
            <ListGroup label="추천" className="w-full shrink-shrink-none">
              {viewProps.recommended.map(
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
                    onOpen={handleItemOpen}
                  />
                ),
              )}
            </ListGroup>
          </div>
        </ScrollArea>
      );
    case 'results': {
      const { onCopyLink: handleCopyLink } = viewProps;
      return (
        <SearchBodyResults
          device={device}
          results={viewProps.results}
          selectedId={viewProps.selectedId}
          contentClassName={contentClassName}
          onItemOpen={handleItemOpen}
          onCopyLink={handleCopyLink}
        />
      );
    }
    case 'no-results':
      return (
        <div className={cn('flex items-center justify-center', contentClassName)}>
          <p className="type-body whitespace-nowrap text-color-black-61">검색 결과 없음</p>
        </div>
      );
  }
}

type SearchBodyResultsProps = {
  device: SearchBodyDevice;
  results: SearchResultGroups;
  selectedId?: string;
  contentClassName?: string;
  onItemOpen?: (id: string) => void;
  onCopyLink?: (id: string) => void;
};

/**
 * 결과 화면을 그린다. 최고 일치는 맨 위 묶음에 보이고, 나머지 결과는 있는 종류만 묶어 보인다.
 * 카드는 목록에서 고른 항목을 따라가고(처음에는 최고 일치), 내용과 동작은 그 항목의 종류에 맞춘다.
 * @codocs [[검색:결과 화면]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device
 * @param props.results 검색 결과
 * @param props.contentClassName 내용 둘레 여백 클래스(좌우 여백 포함). 모바일은 스크롤되는 칸에, 데스크톱은 SearchResults를 담는 바탕에 준다
 * @param props.selectedId 고른 항목의 id. 주지 않으면 최고 일치다
 * @param props.onItemOpen 항목 줄이나 카드의 `열기`를 눌렀을 때 부른다
 * @param props.onCopyLink 카드의 `링크 복사`를 눌렀을 때 부른다
 */
function SearchBodyResults({
  device,
  results,
  contentClassName,
  selectedId: selectedIdProp,
  onItemOpen: handleItemOpen,
  onCopyLink: handleCopyLink,
}: SearchBodyResultsProps): JSX.Element {
  const { bestMatch } = results;
  const cardItem = findResultItem(results, selectedIdProp) ?? bestMatch;
  const selectedId = cardItem.id;
  const cardKindLabel = kindLabels[cardItem.kind];
  // 링크 복사는 주소가 있는 글과 외부 링크에만 둔다(폴더는 열기만).
  const canCopyLink = cardItem.kind !== 'folder';

  /** 카드의 `열기`를 누르면 카드의 항목을 연다고 알린다. */
  function handleOpenCardItem(): void {
    handleItemOpen?.(cardItem.id);
  }

  /** 카드의 `링크 복사`를 누르면 카드의 항목의 링크를 복사한다고 알린다. */
  function handleCopyCardItemLink(): void {
    handleCopyLink?.(cardItem.id);
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
        >
          <MenuItem
            isStandalone
            label="열기"
            icon="icons/ic_fluent_open_20_regular.svg"
            onClick={handleOpenCardItem}
          />
          {canCopyLink && (
            <MenuItem
              isStandalone
              label="링크 복사"
              icon="icons/ic_fluent_link_20_regular.svg"
              onClick={handleCopyCardItemLink}
            />
          )}
        </BestMatchCard>
      }
    >
      <ListGroup label="최고 일치">
        <ItemListRow
          id={bestMatch.id}
          isSelected={selectedId === bestMatch.id}
          title={bestMatch.title}
          subtitle={kindLabels[bestMatch.kind]}
          icon={renderItemIcon({ kind: bestMatch.kind })}
          className="w-full"
          onOpen={handleItemOpen}
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
            <ListGroup key={group.kind} label={kindLabels[group.kind]}>
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
                    onOpen={handleItemOpen}
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
      <ScrollArea className="size-full rounded-radius-control" contentClassName={contentClassName}>
        {searchResults}
      </ScrollArea>
    );
  }
  // 데스크톱 SearchResults는 바탕을 채운다. 여백은 담는 바탕이 갖는다.
  return <div className={cn('flex flex-col', contentClassName)}>{searchResults}</div>;
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
