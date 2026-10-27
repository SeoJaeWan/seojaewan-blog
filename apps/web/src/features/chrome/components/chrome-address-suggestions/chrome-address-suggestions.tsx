import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { AddressBar, Asset, Flyout, ImageAsset, ListItem, Popover } from '@seojaewan/design-system';

/** 주소창 추천 한 줄. 글(post)은 글 아이콘과 주소를, 검색(search)은 돋보기와 검색어 글자를 보인다 */
export type ChromeAddressSuggestion =
  { kind: 'post'; title: string; url: string } | { kind: 'search'; title: string };

type AddressBarProps = ComponentProps<typeof AddressBar>;

type ChromeAddressSuggestionsProps = Pick<
  AddressBarProps,
  | 'onChange'
  | 'onValueChange'
  | 'onKeyDown'
  | 'onFocus'
  | 'onBlur'
  | 'value'
  | 'role'
  | 'aria-label'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-activedescendant'
  | 'aria-autocomplete'
> & {
  /** 피그마 AddressBar Query. 주소창에 입력 중인 글자다(`value`를 주지 않을 때의 처음 값) */
  query?: string;
  /** 추천 목록. 개수는 검색 결과에 따라 정해진다 */
  suggestions: readonly ChromeAddressSuggestion[];
  /** 고른(Selected) 추천의 순서. 없으면 고른 추천이 없다 */
  selectedIndex?: number;
  /** 추천 목록을 열었는지(피그마 Popover State). 닫혀 있으면 평소 주소창 모양이다. 기본은 연 모습(조립 그림)이다 */
  open?: boolean;
  /** 주소창과 추천 목록의 너비(px). 도구 모음에서 남는 너비를 채운 주소창 너비다. 주지 않으면 피그마 조립의 640이다 */
  width?: number;
  /** 추천 목록 요소의 id. 주소창의 `aria-controls`와 추천 줄 id에 쓴다 */
  listId?: string;
  /** 추천 줄을 눌렀을 때. 누른 줄의 순서를 받는다 */
  onSuggestionSelect?: (index: number) => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

// 글 아이콘은 래스터 자산(file/Document), 검색은 돋보기 아이콘이다(피그마 추천 줄의 leading icon).
const suggestionIcons = {
  post: <ImageAsset name="images/file-document" className="size-full object-contain" />,
  search: (
    <Asset
      name="icons/ic_fluent_search_16_regular.svg"
      className="size-icon-16 text-text-fill-primary"
    />
  ),
} as const satisfies Record<ChromeAddressSuggestion['kind'], ReactNode>;

// 피그마 조립의 주소창·추천 목록 너비(size/640)다.
const FIGMA_WIDTH_CLASS_NAME = 'w-640';

/**
 * Chrome 주소창에 입력하는 중 아래에 추천 목록을 연 모습(피그마 조립 `Chrome/AddressSuggestions`)을 그린다.
 * 주소창(AddressBar, Suggesting)을 트리거로, 추천 목록(Flyout + ListItem)을 팝업으로 Popover에 붙인다.
 * 앱에서는 Chrome 도구 모음의 주소창 자리를 채우고, 열림(`open`)과 너비를 쓰는 곳이 정한다. 추천 줄을 눌러도 주소창의
 * 포커스는 그대로다(누를 때 기본 동작을 막는다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeAddressSuggestions(props: ChromeAddressSuggestionsProps): JSX.Element {
  const {
    query,
    suggestions,
    selectedIndex,
    open: isOpen = true,
    width,
    listId,
    onSuggestionSelect,
    className,
    ...addressBarProps
  } = props;
  const sizeClassName = width === undefined ? FIGMA_WIDTH_CLASS_NAME : 'w-full';
  return (
    <Popover
      open={isOpen}
      placement="bottom-start"
      className={className}
      trigger={
        <AddressBar
          {...addressBarProps}
          suggesting={isOpen}
          query={query}
          className={sizeClassName}
        />
      }
      popup={
        <Flyout
          material="solid"
          padding="compact"
          className={width === undefined ? FIGMA_WIDTH_CLASS_NAME : undefined}
          // 주소창 너비는 창 크기에 따라 실행 중에 정해지는 값이라 인라인 스타일로 준다.
          style={width === undefined ? undefined : { width }}
        >
          {/* 피그마 `list inset`(안쪽 여백)과 `items`(줄 사이 간격 2) 배치 프레임이다 */}
          <div className="flex w-full flex-col px-8 pt-2 pb-6">
            <div
              id={listId}
              role="listbox"
              aria-label="추천"
              className="flex w-full flex-col gap-2 overflow-clip"
            >
              {suggestions.map(
                /**
                 * 추천 한 줄을 그린다.
                 * @param suggestion 추천
                 * @param index 순서
                 * @returns ListItem
                 */
                (suggestion, index) => {
                  return (
                    <ListItem
                      key={`${suggestion.kind}-${suggestion.title}-${String(index)}`}
                      id={listId === undefined ? undefined : `${listId}-${String(index)}`}
                      role="option"
                      title={suggestion.title}
                      icon={suggestionIcons[suggestion.kind]}
                      selected={index === selectedIndex}
                      showTrailing={suggestion.kind === 'post'}
                      trailing={suggestion.kind === 'post' ? suggestion.url : undefined}
                      onMouseDown={handleSuggestionMouseDown}
                      onClick={() => {
                        onSuggestionSelect?.(index);
                      }}
                      className="w-full"
                    />
                  );
                },
              )}
            </div>
          </div>
        </Flyout>
      }
    />
  );
}

/**
 * 추천 줄을 누를 때 주소창이 포커스를 잃지 않게 한다(포커스를 잃으면 추천 목록이 닫힌다).
 * @param event 누르기 이벤트
 */
function handleSuggestionMouseDown(event: MouseEvent<HTMLDivElement>): void {
  event.preventDefault();
}
