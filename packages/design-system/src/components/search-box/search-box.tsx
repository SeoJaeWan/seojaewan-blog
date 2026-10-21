import { Input } from '@base-ui/react/input';
import { Search16Regular } from '@fluentui/react-icons/svg/search';
import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';

export type SearchBoxAppearance = 'default' | 'pill';

type SearchBoxProps = Omit<ComponentProps<typeof Input>, 'className' | 'type'> & {
  /** 피그마 Appearance. default는 탐색기 안 검색(아이콘 오른쪽), pill은 Start·검색 패널(아이콘 왼쪽, 완전히 둥근 모서리)이다 */
  appearance?: SearchBoxAppearance;
  /** 바깥 상자에 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 상태별 바깥 상자 모양이다. Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾼다.
// 테두리는 피그마 안쪽 선처럼 자식(포커스 아래 선) 위에 그린다(border-gradient-*, inner-border-*).
const appearanceClassNames = {
  default: {
    base: 'rounded-control py-6 pr-8 pl-12',
    enabled:
      'not-focus-within:border-gradient-elevation-text-control-border focus-within:inner-border-control-stroke-default',
    disabled: 'inner-border-control-stroke-default',
  },
  pill: {
    base: 'rounded-circular px-16 py-8 inner-border-control-stroke-default',
    enabled: '',
    disabled: '',
  },
} as const satisfies Record<SearchBoxAppearance, Record<'base' | 'enabled' | 'disabled', string>>;

/**
 * 검색 상자(피그마 SearchBox)를 그린다. 입력값이 있으면 피그마 Filled=True 모양이 된다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function SearchBox(props: SearchBoxProps): JSX.Element {
  const { appearance = 'default', className, disabled: isDisabled = false, ...inputProps } = props;
  const classNames = appearanceClassNames[appearance];
  const icon = (
    <Search16Regular
      className={mergeClassNames(
        'size-icon-16 shrink-0',
        isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
      )}
    />
  );

  return (
    <div
      className={mergeClassNames(
        'group relative isolate flex items-center gap-8 overflow-hidden type-body',
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
        disabled={isDisabled}
        className="min-w-0 flex-1 truncate bg-transparent text-text-fill-primary outline-none placeholder:text-text-fill-secondary disabled:text-text-fill-disabled disabled:placeholder:text-text-fill-disabled"
      />
      {appearance === 'default' && icon}
      {/* 포커스일 때 아래쪽 강조색 선. 기본 모양은 disabled일 때 아래쪽 1px 선이 더 진해진다. */}
      <span
        aria-hidden
        className={mergeClassNames(
          'pointer-events-none absolute inset-x-0 bottom-0',
          isDisabled
            ? appearance === 'default' && 'border-b-default border-control-stroke-default'
            : 'hidden border-b-focus-outer border-accent-fill-default group-focus-within:block',
        )}
      />
    </div>
  );
}
