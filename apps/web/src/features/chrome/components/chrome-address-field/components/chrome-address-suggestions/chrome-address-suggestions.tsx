import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { AddressBar, Asset, ListItem } from '@seojaewan/design-system';

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
 * Chrome 주소창과 입력하는 중 여는 추천 목록(피그마 조립 `Chrome/AddressSuggestions`)을 그린다.
 * 추천 목록은 팝업이 아니라 주소창이 펼쳐진 모습이다. 열리면(`isOpen`) AddressBar가 Suggesting으로 카드 한 장을 그려
 * 입력 줄과 추천 줄(`suggestions` 자리)을 함께 감싼다. 입력칸은 주소창의 `input` 하나 그대로라
 * 포커스와 접근성 구조(combobox + listbox)는 닫혔을 때와 같다.
 * 앱에서는 Chrome 도구 모음의 주소창 자리를 채우고, 열림(`isOpen`)과 너비를 쓰는 곳이 정한다. 추천 줄을 눌러도 주소창의
 * 포커스는 그대로다(누를 때 기본 동작을 막는다). 고른 줄은 ListItem Selected(회색 바탕)이고 왼쪽 막대는 없다(피그마를 따른다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:주소창]]
 * @param props 컴포넌트 속성
 * @param props.query 피그마 AddressBar Query. 주소창에 입력 중인 글자다(`value`를 주지 않을 때의 처음 값)
 * @param props.suggestions 추천 목록. 개수는 검색 결과에 따라 정해진다
 * @param props.selectedIndex 고른(Selected) 추천의 순서. 없으면 고른 추천이 없다
 * @param props.isOpen 추천 목록을 열었는지(AddressBar Suggesting). 닫혀 있으면 평소 주소창 모양이다. 기본은 닫힌 모습이다
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
  return (
    <div className={className} style={widthStyle}>
      <AddressBar
        {...addressBarProps}
        isSuggesting={isOpen}
        query={query}
        className="w-full"
        suggestions={
          // 피그마 `items`(줄 사이 간격 2) 배치다. 카드와 안쪽 여백은 AddressBar의 Suggestions 자리가 그린다.
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
        }
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
