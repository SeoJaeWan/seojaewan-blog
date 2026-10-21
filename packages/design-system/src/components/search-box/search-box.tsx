import { Input } from '@base-ui/react/input';
import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';
import { Asset } from '../asset/asset';

export type SearchBoxAppearance = 'default' | 'pill';

type SearchBoxProps = Omit<ComponentProps<typeof Input>, 'className' | 'type'> & {
  /** 피그마 Appearance. default는 탐색기 안 검색(아이콘 오른쪽), pill은 Start·검색 패널(아이콘 왼쪽, 완전히 둥근 모서리)이다 */
  appearance?: SearchBoxAppearance;
  /** 바깥 상자에 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 모양별 바깥 상자다. Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾼다.
// 안쪽 선은 피그마 안쪽 선처럼 ::before 고리(border-gradient-*, inner-border-*)로 그린다.
const appearanceClassNames = {
  default: {
    base: 'w-search-box-width h-control-height rounded-control py-6 pr-8 pl-12',
    enabled:
      'not-focus-within:border-gradient-elevation-text-control-border focus-within:inner-border-control-stroke-default',
    disabled: 'inner-border-control-stroke-default',
  },
  pill: {
    base: 'w-search-box-width-pill h-search-box-height-pill rounded-circular px-16 py-8 inner-border-control-stroke-default',
    enabled: '',
    disabled: '',
  },
} as const satisfies Record<SearchBoxAppearance, Record<'base' | 'enabled' | 'disabled', string>>;

// 아래쪽 강조선(피그마 bottom border, 양쪽 늘이기 + 아래 붙임). 포커스일 때 강조색 2px,
// 기본 모양이 disabled일 때 1px 회색 선이다. pill 모양은 포커스일 때만 보인다.
const bottomBorderClassNames = {
  default: {
    enabled:
      'hidden group-focus-within:block group-focus-within:h-stroke-focus-outer group-focus-within:bg-accent-fill-default',
    disabled: 'h-stroke-default bg-control-stroke-default',
  },
  pill: {
    enabled:
      'hidden group-focus-within:block group-focus-within:h-stroke-focus-outer group-focus-within:bg-accent-fill-default',
    disabled: 'hidden',
  },
} as const satisfies Record<SearchBoxAppearance, Record<'enabled' | 'disabled', string>>;

/**
 * 검색 상자(피그마 SearchBox)를 그린다. 입력값이 있으면 피그마 Filled=True 모양이 된다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function SearchBox(props: SearchBoxProps): JSX.Element {
  const { appearance = 'default', className, disabled: isDisabled = false, ...inputProps } = props;
  const classNames = appearanceClassNames[appearance];
  const state = isDisabled ? 'disabled' : 'enabled';
  // data-figma는 피그마 SearchBox의 레이어 이름이다([[피그마 일치 검사:짝짓기]]).
  const icon = (
    <Asset
      data-figma="icon"
      name="icons/ic_fluent_search_16_regular.svg"
      className={mergeClassNames(
        'size-icon-16 shrink-0',
        isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
      )}
    />
  );
  return (
    <div
      data-figma-root="SearchBox"
      className={mergeClassNames(
        'group relative isolate flex items-center justify-start gap-8 overflow-hidden inner-border-w-default',
        'transition-colors duration-faster ease-fade',
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
      {appearance === 'pill' && icon}
      <Input
        {...inputProps}
        type="text"
        role="searchbox"
        data-figma="label"
        disabled={isDisabled}
        className="min-w-0 flex-1 truncate type-body text-text-fill-primary outline-none placeholder:text-text-fill-secondary disabled:text-text-fill-disabled disabled:placeholder:text-text-fill-disabled"
      />
      {appearance === 'default' && icon}
      <span
        aria-hidden
        data-figma="bottom border"
        className={mergeClassNames(
          'pointer-events-none absolute inset-x-0 bottom-0',
          bottomBorderClassNames[appearance][state],
        )}
      />
    </div>
  );
}
