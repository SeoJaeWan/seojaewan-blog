import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, type ReactNode, useRef } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type AddressBarProps = Omit<ComponentProps<typeof Input>, 'className' | 'defaultValue' | 'type'> & {
  className?: string;
  query?: string;
  isSuggesting?: boolean;
  suggestions?: ReactNode;
  url?: string;
};

// Base UI Input이 넘기는 마우스 이벤트다.
type InputMouseEvent = Parameters<NonNullable<AddressBarProps['onMouseDown']>>[0];

// 평소(Suggesting이 아닐 때) 바깥 상자다. Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾼다.
// 피그마 Focused의 선은 안쪽 선이지만 레이아웃에 포함되어(strokesIncludedInLayout) 높이가 40으로 늘어난다.
// 그래서 CSS border로 그려 입력 줄(36) 바깥에 2px씩 더한다.
// Suggesting은 아래 카드가 입력 줄까지 감싸므로 바깥 상자는 바탕·선 없이 투명하다.
const REST_CONTAINER_CLASS_NAMES = [
  'rounded-radius-circular bg-color-blue-5',
  'hover:not-focus-within:bg-color-gray-9',
  'focus-within:border-stroke-width-focus-outer focus-within:border-color-blue-60 focus-within:bg-color-white',
] as const;

// Suggesting에서 입력 줄과 추천 자리를 함께 감싸는 카드다. 바탕·그림자·둥글기·선 색과 두께는 Flyout Material=Solid와 같다.
// 피그마에서 카드의 선은 레이아웃에 들어가지 않으므로(strokesIncludedInLayout=false) Flyout처럼 CSS border로 그리지 않고
// 안쪽 선 고리(inner-border-*)로 그린다. 위 끝은 입력 줄 위 끝보다 spacing/2xs 위이고, 양옆은 바깥 상자 끝에 맞춘다.
const SUGGESTING_CARD_CLASS_NAMES = [
  'absolute inset-x-spacing-none -top-spacing-2xs flex flex-col py-spacing-2xs',
  'rounded-radius-overlay bg-material-fallback-acrylic-default shadow-elevation-flyout',
  'inner-border-color-black-6 inner-border-w-stroke-width-default',
] as const;

// 앞 아이콘 자리다.
const ICON_CLASS_NAME = 'size-size-icon-sm shrink-shrink-none text-color-gray-70';

/**
 * Chrome 주소창(피그마 AddressBar)을 그린다. BrowserToolbar와 Chrome 주소창 조립에 쓴다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * 입력값이 비면 피그마 Filled=False 모양이 된다. SearchBox처럼 값으로 정하고 prop을 두지 않는다.
 * 안내 문구가 보이는 동안(`:placeholder-shown`) 앞 아이콘이 사이트 정보(i)에서 돋보기로 바뀐다.
 * 포커스를 받으면 주소 전체를 선택한다. 피그마 Focused의 주소 글자 모습은 실제 글자 선택(`::selection`)이다.
 * 추천 목록은 팝업이 아니라 주소창이 펼쳐진 모습이다. `isSuggesting`이면 카드 한 장이 입력 줄과 추천 자리(`suggestions`)를 함께 감싼다.
 * 카드는 바깥 상자 안의 절대 위치 요소라 바깥 상자는 입력 줄 높이만 차지하고, 쓰는 곳(BrowserToolbar)의 배치가 바뀌지 않는다.
 * 바깥 상자가 쌓임 맥락(`z-layer-popover`)을 만들어 카드가 아래 페이지 위에 뜨고, 안에서는 카드를 먼저·입력 줄을 나중에
 * 두어(둘 다 위치 지정, z 없음) 입력 줄이 카드 위 층에 그려진다. 입력칸은 Suggesting을 켜고 꺼도 같은 요소라 포커스가 남는다.
 * 너비는 갖지 않고 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[Chrome:주소창]]
 * @param props 컴포넌트 속성
 * @param props.className 바깥 상자에 덧붙일 클래스. 너비 같은 바깥 배치에만 쓴다
 * @param props.query 피그마 TEXT 속성 Query. 추천 목록이 열린 동안(`isSuggesting`) 입력창의 처음 값이다
 * @param props.isSuggesting 피그마 State=Suggesting. 입력하는 중이고 추천 목록이 열려 있음을 나타낸다.
 *   카드가 입력 줄과 추천 자리를 감싸고, 바깥 상자는 바탕 없이 투명해지며, 앞 아이콘이 돋보기로 바뀐다
 * @param props.suggestions 피그마 SLOT Suggestions. Suggesting에서 입력 줄 아래 추천 줄 자리다(줄 사이 spacing/2xs)
 * @param props.url 피그마 TEXT 속성 URL. 평소 입력창의 처음 값이다(`value`를 주면 url·query를 쓰지 않는다)
 * @param props.placeholder 피그마 TEXT 속성 Placeholder. 입력값이 비었을 때 보이는 안내 문구다
 * @param props.value 입력창 값(제어). 주면 url·query를 처음 값으로 쓰지 않는다
 * @param props.onFocus 포커스를 받았을 때 호출. 부르기 전에 입력창 글자를 모두 고른다
 * @param props.onMouseDown 입력창을 눌렀을 때 호출
 * @param props.onMouseUp 입력창에서 손을 뗐을 때 호출. 포커스를 준 누름이면 전체 선택을 남긴다
 */
export function AddressBar({
  className,
  query = '검색어',
  isSuggesting = false,
  suggestions,
  url = '웹 주소',
  placeholder = '글 검색 또는 URL 입력',
  value,
  onFocus,
  onMouseDown,
  onMouseUp,
  ...inputProps
}: AddressBarProps): JSX.Element {
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
        'relative flex flex-col motion-control-state',
        isSuggesting ? 'z-layer-popover' : REST_CONTAINER_CLASS_NAMES,
        className,
      )}
    >
      {isSuggesting && (
        <div className={cn(SUGGESTING_CARD_CLASS_NAMES)}>
          {/* 입력 줄이 위 층에 겹치는 빈 자리다 */}
          <div className="h-size-address-bar-height shrink-shrink-none" />
          {/* 피그마 Suggestions 슬롯이다 */}
          <div className="flex flex-col gap-spacing-2xs px-spacing-sm pt-spacing-2xs pb-spacing-sm-nudge">
            {suggestions}
          </div>
        </div>
      )}
      <div className="group relative flex h-size-address-bar-height items-center gap-spacing-md overflow-clip px-spacing-lg">
        {isSuggesting ? (
          <Asset name="icons/ic_material_search_20_outlined.svg" className={ICON_CLASS_NAME} />
        ) : (
          <>
            <Asset
              name="icons/ic_fluent_info_24_regular.svg"
              className={cn(ICON_CLASS_NAME, 'group-has-placeholder-shown:hidden')}
            />
            <Asset
              name="icons/ic_material_search_20_outlined.svg"
              className={cn(ICON_CLASS_NAME, 'hidden group-has-placeholder-shown:block')}
            />
          </>
        )}
        <Input
          {...inputProps}
          type="text"
          placeholder={placeholder}
          value={value}
          defaultValue={value === undefined ? (isSuggesting ? query : url) : undefined}
          onFocus={(event) => {
            event.currentTarget.select();
            onFocus?.(event);
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className={cn(
            'min-w-size-none flex-flex-fill truncate type-body text-color-gray-88 outline-none placeholder:text-color-black-61',
            'selection:bg-color-blue-9 selection:text-color-gray-88',
          )}
        />
      </div>
    </div>
  );
}
