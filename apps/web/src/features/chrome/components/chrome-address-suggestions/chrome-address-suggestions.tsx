import type { ComponentProps, JSX, ReactNode } from 'react';

import { AddressBar, Asset, Flyout, ImageAsset, ListItem, Popover } from '@seojaewan/design-system';

/** 주소창 추천 한 줄. 글(post)은 글 아이콘과 주소를, 검색(search)은 돋보기와 검색어 글자를 보인다 */
export type ChromeAddressSuggestion =
  { kind: 'post'; title: string; url: string } | { kind: 'search'; title: string };

type AddressBarProps = ComponentProps<typeof AddressBar>;

type ChromeAddressSuggestionsProps = Pick<
  AddressBarProps,
  'onChange' | 'onValueChange' | 'onKeyDown' | 'aria-label'
> & {
  /** 피그마 AddressBar Query. 주소창에 입력 중인 글자다 */
  query: string;
  /** 추천 목록. 개수는 검색 결과에 따라 정해진다 */
  suggestions: readonly ChromeAddressSuggestion[];
  /** 고른(Selected) 추천의 순서. 없으면 고른 추천이 없다 */
  selectedIndex?: number;
  /** 바깥 배치 클래스 */
  className?: string;
};

// 글 아이콘은 래스터 자산(file/Document), 검색은 돋보기 아이콘이다(피그마 추천 줄의 leading icon).
const suggestionIcons = {
  post: <ImageAsset name="images/file-document.png" className="size-full object-contain" />,
  search: (
    <Asset
      name="icons/ic_fluent_search_16_regular.svg"
      className="size-icon-16 text-text-fill-primary"
    />
  ),
} as const satisfies Record<ChromeAddressSuggestion['kind'], ReactNode>;

/**
 * Chrome 주소창에 입력하는 중 아래에 추천 목록을 연 모습(피그마 조립 `Chrome/AddressSuggestions`)을 그린다.
 * 주소창(AddressBar, Suggesting)을 트리거로, 추천 목록(Flyout + ListItem)을 팝업으로 Popover에 붙인다.
 * 열고 닫기와 고르기는 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeAddressSuggestions(props: ChromeAddressSuggestionsProps): JSX.Element {
  const { query, suggestions, selectedIndex, className, ...addressBarProps } = props;
  return (
    <Popover
      open
      placement="bottom-start"
      className={className}
      trigger={<AddressBar {...addressBarProps} suggesting query={query} className="w-640" />}
      popup={
        <Flyout material="solid" padding="compact" className="w-640">
          {/* 피그마 `list inset`(안쪽 여백)과 `items`(줄 사이 간격 2) 배치 프레임이다 */}
          <div className="flex w-full flex-col px-8 pt-2 pb-6">
            <div className="flex w-full flex-col gap-2 overflow-clip">
              {suggestions.map(
                /**
                 * 추천 한 줄을 그린다.
                 * @param suggestion 추천
                 * @param index 순서
                 * @returns ListItem
                 */
                (suggestion, index) => (
                  <ListItem
                    key={`${suggestion.kind}-${suggestion.title}`}
                    title={suggestion.title}
                    icon={suggestionIcons[suggestion.kind]}
                    selected={index === selectedIndex}
                    showTrailing={suggestion.kind === 'post'}
                    trailing={suggestion.kind === 'post' ? suggestion.url : undefined}
                    className="w-full"
                  />
                ),
              )}
            </div>
          </div>
        </Flyout>
      }
    />
  );
}
