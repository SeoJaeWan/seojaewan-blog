import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { AddressBar, Asset, cn, Flyout, ListItem } from '@seojaewan/design-system';

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
  query?: string;
  suggestions: readonly ChromeAddressSuggestion[];
  selectedIndex?: number;
  isOpen?: boolean;
  width?: number;
  listId?: string;
  onSuggestionSelect?: (index: number) => void;
  className?: string;
};

// 글 아이콘과 검색 돋보기는 Chrome 창 안의 Material 아이콘이다(피그마 추천 줄의 leading icon). 색은 도구 모음 아이콘과 같다.
const SUGGESTION_ICON_CLASS_NAME = 'text-color-gray-70';
const suggestionIcons = {
  post: (
    <Asset
      name="icons/ic_material_description_20_outlined.svg"
      className={SUGGESTION_ICON_CLASS_NAME}
    />
  ),
  search: (
    <Asset name="icons/ic_material_search_20_outlined.svg" className={SUGGESTION_ICON_CLASS_NAME} />
  ),
} as const satisfies Record<ChromeAddressSuggestion['kind'], ReactNode>;

/**
 * Chrome 주소창과 입력하는 중 여는 추천 목록(피그마 조립 `Chrome/AddressSuggestions`, State=Closed·Open)을 그린다.
 * 열리면 Flyout 한 장이 입력 줄까지 감싼다. Flyout을 주소창 자리만큼 위로 올려 맨 위에 주소창 높이의 빈 자리를 두고,
 * 투명해진 주소창(AddressBar, Suggesting)을 그 자리 위 층에 겹친다. 입력칸은 주소창의 `input` 하나 그대로라
 * 포커스와 접근성 구조(combobox + listbox)는 닫혔을 때와 같다.
 * Popover의 붙는 자리는 모두 트리거 밖에 간격을 두고 붙어 트리거를 감쌀 수 없으므로, 이 조립이 Flyout의 위치를 직접 정한다.
 * 앱에서는 Chrome 도구 모음의 주소창 자리를 채우고, 열림(`isOpen`)과 너비를 쓰는 곳이 정한다. 추천 줄을 눌러도 주소창의
 * 포커스는 그대로다(누를 때 기본 동작을 막는다). 고른 줄은 ListItem Selected(회색 바탕)이고 왼쪽 막대는 없다(피그마를 따른다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Chrome:주소창]]
 * @param props 컴포넌트 속성
 * @param props.query 피그마 AddressBar Query. 주소창에 입력 중인 글자다(`value`를 주지 않을 때의 처음 값)
 * @param props.suggestions 추천 목록. 개수는 검색 결과에 따라 정해진다
 * @param props.selectedIndex 고른(Selected) 추천의 순서. 없으면 고른 추천이 없다
 * @param props.isOpen 추천 목록을 열었는지(피그마 State=Open). 닫혀 있으면 평소 주소창 모양이다. 기본은 닫힌 모습이다
 * @param props.width 주소창과 추천 목록의 너비(px). 도구 모음에서 남는 너비를 채운 주소창 너비다. 주지 않으면 바깥 배치(`className`)가 정한다
 * @param props.listId 추천 목록 요소의 id. 주소창의 `aria-controls`와 추천 줄 id에 쓴다
 * @param props.onSuggestionSelect 추천 줄을 눌렀을 때. 누른 줄의 순서를 받는다
 * @param props.className 바깥 배치 클래스
 */
export function ChromeAddressSuggestions({
  query,
  suggestions,
  selectedIndex,
  isOpen = false,
  width,
  listId,
  onSuggestionSelect,
  className,
  ...addressBarProps
}: ChromeAddressSuggestionsProps): JSX.Element {
  // 주소창 너비는 창 크기에 따라 실행 중에 정해지는 값이라 인라인 스타일로 준다.
  const widthStyle = width === undefined ? undefined : { width };
  // 바깥 상자가 쌓임 맥락(z-layer-popover)을 만들어 열린 Flyout이 아래 페이지 위에 뜨게 한다.
  // 안에서는 Flyout을 먼저, 주소창을 나중에 두어(둘 다 위치 지정, z 없음) 주소창이 Flyout 위 층에 그려진다.
  return (
    <div className={cn('relative z-layer-popover flex flex-col', className)} style={widthStyle}>
      {isOpen && (
        // 피그마 State=Open: Flyout 위 끝이 주소창 위 끝보다 2px 위에 있다.
        <Flyout material="solid" className="absolute inset-x-spacing-none -top-spacing-2xs">
          {/* 피그마 `address bar space`: 투명한 주소창이 겹치는 자리다 */}
          <div className="h-size-address-bar-height w-full shrink-shrink-none" />
          {/* 피그마 `list inset`(안쪽 여백)과 `items`(줄 사이 간격 2) 배치 프레임이다 */}
          <div className="flex w-full flex-col px-spacing-sm pt-spacing-2xs pb-spacing-sm-nudge">
            <div
              id={listId}
              role="listbox"
              aria-label="추천"
              className="flex w-full flex-col gap-spacing-2xs overflow-clip"
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
                      isSelected={index === selectedIndex}
                      hasTrailing={suggestion.kind === 'post'}
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
      )}
      <AddressBar
        {...addressBarProps}
        isSuggesting={isOpen}
        query={query}
        className="relative w-full"
      />
    </div>
  );
}

/**
 * 추천 줄을 누를 때 주소창이 포커스를 잃지 않게 한다(포커스를 잃으면 추천 목록이 닫힌다).
 * @param event 누르기 이벤트
 */
function handleSuggestionMouseDown(event: MouseEvent<HTMLDivElement>): void {
  event.preventDefault();
}
