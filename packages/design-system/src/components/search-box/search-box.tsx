import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, useState } from 'react';

import { mergeClassNames } from '../../merge-class-names';
import { Asset } from '../asset/asset';

export type SearchBoxAppearance = 'default' | 'pill' | 'taskbar';

type SearchBoxProps = Omit<ComponentProps<typeof Input>, 'className' | 'type'> & {
  /**
   * 피그마 Appearance. default는 탐색기 안 검색(아이콘 오른쪽), pill은 Start·검색 패널(아이콘 왼쪽, 완전히 둥근 모서리),
   * taskbar는 작업 표시줄 검색칸(pill과 같은 모양, 작업 표시줄 크기)이다
   */
  appearance?: SearchBoxAppearance;
  /** 바깥 상자에 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 모양별 바깥 상자다. Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾼다.
// 안쪽 선은 피그마 안쪽 선처럼 ::before 고리(border-gradient-*, inner-border-*)로 그린다.
// 상태 전환(M1)은 피그마 프로토타입 전환과 같은 시간·이징 토큰을 쓴다:
// default는 Rest→Hover(motion/duration/faster, fade), pill·taskbar는 Rest→Focused(fast, direct-entrance)다.
const appearanceClassNames = {
  default: {
    base: 'w-search-box-width h-control-height rounded-control py-6 pr-8 pl-12 duration-faster ease-fade',
    enabled:
      'not-focus-within:border-gradient-elevation-text-control-border focus-within:inner-border-control-stroke-default',
    disabled: 'inner-border-control-stroke-default',
  },
  pill: {
    base: 'w-search-box-width-pill h-search-box-height-pill rounded-circular px-16 py-8 inner-border-control-stroke-default duration-fast ease-direct-entrance',
    enabled: '',
    disabled: '',
  },
  taskbar: {
    base: 'w-search-box-width-taskbar h-control-height rounded-circular px-16 py-6 inner-border-control-stroke-default duration-fast ease-direct-entrance',
    enabled: '',
    disabled: '',
  },
} as const satisfies Record<SearchBoxAppearance, Record<'base' | 'enabled' | 'disabled', string>>;

// 아래쪽 강조선(피그마 bottom border, 양쪽 늘이기 + 아래 붙임). 기본 모양만 있다.
// 포커스일 때 강조색 2px, disabled일 때 1px 회색 선이다.
const BOTTOM_BORDER_CLASS_NAMES = {
  enabled:
    'hidden group-focus-within:block group-focus-within:h-stroke-focus-outer group-focus-within:bg-accent-fill-default',
  disabled: 'h-stroke-default bg-control-stroke-default',
} as const;

/**
 * 검색 상자(피그마 SearchBox)를 그린다. 입력값이 있으면 피그마 Filled=True 모양이 된다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * pill·taskbar는 포커스일 때 돋보기가 여러 색 자산(icon-color/Search)으로 바뀐다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function SearchBox(props: SearchBoxProps): JSX.Element {
  const {
    appearance = 'default',
    className,
    disabled: isDisabled = false,
    onFocus,
    onBlur,
    ...inputProps
  } = props;
  const [isFocused, setIsFocused] = useState(false);
  const classNames = appearanceClassNames[appearance];
  const state = isDisabled ? 'disabled' : 'enabled';
  const hasColorIcon = appearance !== 'default' && isFocused && !isDisabled;
  const icon = (
    <Asset
      name={
        hasColorIcon
          ? 'illustrations/icon-color-search.svg'
          : 'icons/ic_fluent_search_16_regular.svg'
      }
      className={mergeClassNames(
        'size-icon-16 shrink-0',
        isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
      )}
    />
  );
  return (
    <div
      className={mergeClassNames(
        'group relative isolate flex items-center justify-start gap-8 overflow-hidden inner-border-w-default',
        'transition-colors',
        classNames.base,
        isDisabled
          ? ['bg-control-fill-disabled', classNames.disabled]
          : [
              'bg-control-fill-default focus-within:bg-control-fill-input-active hover:not-focus-within:bg-control-fill-secondary',
              classNames.enabled,
            ],
        className,
      )}
    >
      {appearance !== 'default' && icon}
      <Input
        {...inputProps}
        type="text"
        role="searchbox"
        disabled={isDisabled}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        className="min-w-0 flex-1 truncate type-body text-text-fill-primary outline-none placeholder:text-text-fill-secondary disabled:text-text-fill-disabled disabled:placeholder:text-text-fill-disabled"
      />
      {appearance === 'default' && icon}
      {appearance === 'default' && (
        <span
          aria-hidden
          className={mergeClassNames(
            'pointer-events-none absolute inset-x-0 bottom-0',
            BOTTOM_BORDER_CLASS_NAMES[state],
          )}
        />
      )}
    </div>
  );
}
