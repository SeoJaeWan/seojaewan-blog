import { Input } from '@base-ui/react/input';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { useSolidSearchIcon } from './use-solid-search-icon';

export type SearchBoxAppearance = 'default' | 'pill' | 'taskbar' | 'web';

type SearchBoxProps = Omit<ComponentProps<typeof Input>, 'className' | 'type'> & {
  /**
   * 피그마 Appearance. default는 탐색기 안 검색(아이콘 오른쪽), pill은 Start·검색 패널(아이콘 왼쪽, 완전히 둥근 모서리),
   * taskbar는 작업 표시줄 검색칸, web은 Chrome 새 탭 검색칸(검색 아이콘 효과 없음)이다
   */
  appearance?: SearchBoxAppearance;
  /** 바깥 상자에 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

/**
 * 검색 상자(피그마 SearchBox)를 그린다. 입력값이 있으면 피그마 Filled=True 모양이 된다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * 역할은 기본이 `searchbox`이고, `combobox`처럼 `aria-expanded`가 필요한 역할은 `role`로 넘기면 그대로 따른다.
 * Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾸고, 안쪽 선은 피그마 안쪽 선처럼 ::before 고리
 * (border-gradient-*, inner-border-*)로 그린다. 상태 전환은 피그마 프로토타입 전환과 같은 모션 클래스를 쓴다:
 * default·web은 Rest→Hover(motion-control-state), pill·taskbar는 Rest→Focused(motion-search-box-focus-state)다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function SearchBox(props: SearchBoxProps): JSX.Element {
  const { appearance = 'default', className, disabled: isDisabled = false, ...inputProps } = props;
  const isDefault = appearance === 'default';
  const isWindowsSearch = appearance === 'pill' || appearance === 'taskbar';
  return (
    <div
      className={cn(
        'group relative isolate flex items-center justify-start gap-spacing-sm overflow-hidden inner-border-w-stroke-width-default',
        isDisabled
          ? 'bg-control-fill-disabled'
          : 'bg-control-fill-default focus-within:bg-control-fill-input-active hover:not-focus-within:bg-control-fill-secondary',
        isDefault &&
          'inner-border-control-stroke-default h-size-control-height rounded-radius-control py-spacing-sm-nudge pr-spacing-sm pl-spacing-md motion-control-state',
        appearance === 'pill' &&
          'inner-border-control-stroke-default h-size-search-box-tall-height rounded-radius-circular px-spacing-lg py-spacing-sm motion-search-box-focus-state',
        appearance === 'taskbar' &&
          'inner-border-control-stroke-default h-size-control-height rounded-radius-circular px-spacing-lg py-spacing-sm-nudge motion-search-box-focus-state',
        appearance === 'web' &&
          'inner-border-control-stroke-default h-size-search-box-tall-height rounded-radius-circular px-spacing-lg py-spacing-sm motion-control-state',
        isWindowsSearch && !isDisabled && 'active:bg-control-fill-input-active',
        className,
      )}
    >
      {isWindowsSearch && <SearchIcons isDisabled={isDisabled} />}
      {appearance === 'web' && (
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'size-size-icon-sm shrink-shrink-none',
            isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
          )}
        />
      )}
      <Input
        // 기본 역할은 searchbox다. 추천 목록을 거느리는 쓰는 곳은 넘겨받은 role(combobox 등)로 덮는다.
        role="searchbox"
        {...inputProps}
        type="text"
        disabled={isDisabled}
        className="min-w-size-none flex-flex-fill truncate type-body text-text-fill-primary outline-none placeholder:text-text-fill-secondary disabled:text-text-fill-disabled disabled:placeholder:text-text-fill-disabled"
      />
      {isDefault && (
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'size-size-icon-sm shrink-shrink-none',
            isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
          )}
        />
      )}
      {isDefault && (
        // 아래쪽 강조선(피그마 bottom border, 양쪽 늘이기 + 아래 붙임). 포커스일 때 강조색 2px, disabled일 때 1px 회색 선이다.
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-spacing-none bottom-spacing-none',
            isDisabled
              ? 'h-stroke-stroke-width-default bg-control-stroke-default'
              : 'hidden group-focus-within:block group-focus-within:h-stroke-stroke-width-focus-outer group-focus-within:bg-accent-fill-default',
          )}
        />
      )}
    </div>
  );
}

/**
 * pill·taskbar의 돋보기를 그린다. Hover·Focused·Pressed에는 그라데이션 자산을 1.1배로 키워 쓰고(누를 때 따로 줄지 않는다),
 * 나타날 때 강조 모션(motion-search-box-focus)을 재생한다.
 * Safari 계열 WebKit에서는 그라데이션 대신 단색 강조색을 쓴다. disabled면 늘 회색이다.
 * @codocs [[검색:입력칸]]
 * @param props 돋보기 속성
 * @param props.isDisabled disabled 여부
 * @returns 겹친 두 돋보기
 */
function SearchIcons({ isDisabled }: { isDisabled: boolean }): JSX.Element {
  const shouldUseSolidIcon = useSolidSearchIcon();
  return (
    <span className="grid size-size-icon-sm shrink-shrink-none place-items-center">
      <span className="grid size-size-icon-sm">
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'col-start-grid-start row-start-grid-start size-size-icon-sm',
            isDisabled
              ? 'text-text-fill-disabled'
              : shouldUseSolidIcon
                ? 'text-text-fill-secondary group-focus-within:motion-search-box-focus-rest group-focus-within:text-accent-fill-default group-hover:motion-search-box-focus-rest group-hover:text-accent-fill-default'
                : 'text-text-fill-secondary group-focus-within:hidden group-hover:hidden',
          )}
        />
        {!isDisabled && !shouldUseSolidIcon && (
          // 호버·포커스에서만 보이므로 보일 때마다 강조 모션이 처음부터 재생된다. 배율 1.1은 끝 모습이다.
          <Asset
            name="illustrations/icon-color-search-focus.svg"
            className="col-start-grid-start row-start-grid-start hidden size-size-icon-sm motion-search-box-focus motion-search-box-focus-rest group-focus-within:block group-hover:block"
          />
        )}
      </span>
    </span>
  );
}
