import {
  type ComponentProps,
  type JSX,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

import { Asset, Flyout, ImageAsset, ListItem, Popover, SearchBox } from '@seojaewan/design-system';

/** 새 탭 검색 추천 한 줄. 글(post)은 글 아이콘, 검색(search)은 돋보기와 검색어 글자를 보인다 */
export type ChromeNewTabSuggestion = { kind: 'post' | 'search'; title: string };

type SearchBoxProps = ComponentProps<typeof SearchBox>;

type ChromeNewTabSearchProps = Pick<
  SearchBoxProps,
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'onKeyDown'
  | 'onFocus'
  | 'onBlur'
  | 'role'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-activedescendant'
  | 'aria-autocomplete'
> & {
  /** 추천 목록. 개수는 검색 결과에 따라 정해진다 */
  suggestions?: readonly ChromeNewTabSuggestion[];
  /** 피그마 State. 추천 목록을 열었는지다. 열면 입력칸에 포커스를 준다(입력 중인 모습). 기본은 닫힌 모습이다 */
  open?: boolean;
  /** 고른(Selected) 추천의 순서. 없으면 고른 추천이 없다 */
  selectedIndex?: number;
  /** 추천 목록 요소의 id. 검색창의 `aria-controls`와 추천 줄 id에 쓴다 */
  listId?: string;
  /** 추천 줄을 눌렀을 때. 누른 줄의 순서를 받는다 */
  onSuggestionSelect?: (index: number) => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

const PLACEHOLDER = '글 검색 또는 URL 입력';

// 글 아이콘은 래스터 자산(file/Document), 검색은 돋보기 아이콘이다(피그마 추천 줄의 leading icon).
const suggestionIcons = {
  post: <ImageAsset name="images/file-document" className="size-full object-contain" />,
  search: (
    <Asset
      name="icons/ic_fluent_search_16_regular.svg"
      className="size-icon-16 text-text-fill-primary"
    />
  ),
} as const satisfies Record<ChromeNewTabSuggestion['kind'], ReactNode>;

/**
 * 새 탭 페이지 가운데의 검색창과 입력 중 추천 목록(피그마 조립 `Chrome/NewTabSearch`)을 그린다.
 * 검색창(SearchBox, Web)을 트리거로, 추천 목록(Flyout + ListItem)을 같은 너비(320)의 팝업으로 Popover에 붙인다.
 * 검색창은 주소창과 같이 동작하므로([[Chrome:새 탭 페이지]]) 추천 줄은 주소창 추천과 같은 규칙으로 채우고,
 * 열고 닫기·고르기는 쓰는 곳이 정한다. 추천 줄을 눌러도 검색창의 포커스는 그대로다(누를 때 기본 동작을 막는다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeNewTabSearch(props: ChromeNewTabSearchProps): JSX.Element {
  const {
    suggestions = [],
    open: isOpen = false,
    selectedIndex,
    listId,
    onSuggestionSelect,
    className,
    ...searchBoxProps
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    /** 추천 목록을 열면 입력칸에 포커스를 준다(입력 중인 모습). */
    () => {
      if (isOpen) {
        inputRef.current?.focus();
      }
    },
    [isOpen],
  );

  return (
    <Popover
      open={isOpen}
      placement="bottom-start"
      className={className}
      trigger={
        <SearchBox
          {...searchBoxProps}
          ref={inputRef}
          appearance="web"
          placeholder={PLACEHOLDER}
          aria-label={PLACEHOLDER}
          className="w-320"
        />
      }
      popup={
        <Flyout material="solid" padding="compact" className="w-320">
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
 * 추천 줄을 누를 때 검색창이 포커스를 잃지 않게 한다(포커스를 잃으면 추천 목록이 닫힌다).
 * @param event 누르기 이벤트
 */
function handleSuggestionMouseDown(event: MouseEvent<HTMLDivElement>): void {
  event.preventDefault();
}
