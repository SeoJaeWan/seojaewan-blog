import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, useRef } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type AddressBarProps = Omit<ComponentProps<typeof Input>, 'className' | 'defaultValue' | 'type'> & {
  /** 바깥 상자에 덧붙일 클래스. 너비 같은 바깥 배치에만 쓴다 */
  className?: string;
  /** 피그마 TEXT 속성 Query. 추천 목록이 열린 동안(`suggesting`) 입력창의 처음 값이다 */
  query?: string;
  /**
   * 피그마 State=Suggesting. 입력하는 중이고 추천 목록이 열려 있음을 나타낸다.
   * 바탕이 흰 팝업 머리 모양(모서리 overlay, 그림자)이 되고 앞 아이콘이 돋보기로 바뀐다
   */
  suggesting?: boolean;
  /** 피그마 TEXT 속성 URL. 평소 입력창의 처음 값이다(`value`를 주면 url·query를 쓰지 않는다) */
  url?: string;
};

// Base UI Input이 넘기는 마우스 이벤트다.
type InputMouseEvent = Parameters<NonNullable<AddressBarProps['onMouseDown']>>[0];

// 상태별 바깥 상자다. Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾼다.
// 피그마 Focused의 선은 안쪽 선이지만 레이아웃에 포함되어(strokesIncludedInLayout) 높이가 40으로 늘어난다.
// 그래서 CSS border로 그려 입력 줄(36) 바깥에 2px씩 더한다.
const CONTAINER_CLASS_NAMES = {
  rest: [
    'rounded-circular bg-chrome-omnibox-fill',
    'hover:not-focus-within:bg-chrome-omnibox-fill-hover',
    'focus-within:border-focus-outer focus-within:border-chrome-omnibox-stroke-focus focus-within:bg-chrome-toolbar-fill',
  ],
  suggesting: 'rounded-overlay bg-chrome-toolbar-fill shadow-elevation-flyout',
} as const;

/**
 * Chrome 주소창(피그마 AddressBar)을 그린다. BrowserToolbar와 주소창 추천 조립의 트리거에 쓴다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * 포커스를 받으면 주소 전체를 선택한다. 피그마 Focused의 흰 글자는 실제 글자 선택(`::selection`)이다.
 * 추천 목록은 조립이 Popover로 붙이고, 열려 있는 동안 `suggesting`을 켠다.
 * 너비는 갖지 않고 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function AddressBar(props: AddressBarProps): JSX.Element {
  const {
    className,
    query = '검색어',
    suggesting: isSuggesting = false,
    url = '웹 주소',
    value,
    onFocus,
    onMouseDown,
    onMouseUp,
    ...inputProps
  } = props;
  // 마우스로 포커스를 받으면 mouseup이 커서를 놓아 선택을 푼다. 포커스를 주는 누름의 mouseup만 막아 전체 선택을 남긴다.
  const shouldKeepSelectionRef = useRef(false);

  /**
   * 포커스를 주는 누름인지 기억한다.
   * @param event 마우스 누름 이벤트
   */
  function handleMouseDown(event: InputMouseEvent): void {
    shouldKeepSelectionRef.current = document.activeElement !== event.currentTarget;
    onMouseDown?.(event);
  }

  /**
   * 포커스를 준 누름이면 커서를 놓지 않게 막아 전체 선택을 남긴다.
   * @param event 마우스 뗌 이벤트
   */
  function handleMouseUp(event: InputMouseEvent): void {
    if (shouldKeepSelectionRef.current) {
      shouldKeepSelectionRef.current = false;
      event.preventDefault();
    }
    onMouseUp?.(event);
  }

  return (
    <div
      className={cn(
        'flex flex-col transition-colors',
        isSuggesting ? CONTAINER_CLASS_NAMES.suggesting : CONTAINER_CLASS_NAMES.rest,
        className,
      )}
    >
      <div className="flex h-36 items-center gap-12 overflow-clip px-16">
        <Asset
          name={
            isSuggesting
              ? 'icons/ic_fluent_search_16_regular.svg'
              : 'icons/ic_fluent_info_24_regular.svg'
          }
          className="size-icon-16 shrink-0 text-chrome-text-secondary"
        />
        <Input
          {...inputProps}
          type="text"
          value={value}
          defaultValue={value === undefined ? (isSuggesting ? query : url) : undefined}
          onFocus={(event) => {
            event.currentTarget.select();
            onFocus?.(event);
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className={cn(
            'min-w-0 flex-1 truncate type-body text-chrome-text-primary outline-none',
            'selection:bg-accent-fill-selected-text-background selection:text-text-on-accent-fill-selected-text',
          )}
        />
      </div>
    </div>
  );
}
