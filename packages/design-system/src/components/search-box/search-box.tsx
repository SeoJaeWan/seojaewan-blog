import { Input } from '@base-ui/react/input';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
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

/**
 * 검색 상자(피그마 SearchBox)를 그린다. 입력값이 있으면 피그마 Filled=True 모양이 된다.
 * 입력과 접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * Hover·Focused는 실제 CSS 상태(hover, focus-within)로 바꾸고, 안쪽 선은 피그마 안쪽 선처럼 ::before 고리
 * (border-gradient-*, inner-border-*)로 그린다. 상태 전환은 피그마 프로토타입 전환과 같은 모션 클래스를 쓴다:
 * default는 Rest→Hover(motion-control-state), pill·taskbar는 Rest→Focused(motion-search-box-focus-state)다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function SearchBox(props: SearchBoxProps): JSX.Element {
  const { appearance = 'default', className, disabled: isDisabled = false, ...inputProps } = props;
  const isDefault = appearance === 'default';
  return (
    <div
      className={cn(
        'group relative isolate flex items-center justify-start gap-8 overflow-hidden inner-border-w-default',
        isDisabled
          ? 'bg-control-fill-disabled'
          : 'bg-control-fill-default focus-within:bg-control-fill-input-active hover:not-focus-within:bg-control-fill-secondary',
        isDefault && [
          'h-control-height rounded-control py-6 pr-8 pl-12 motion-control-state',
          isDisabled
            ? 'inner-border-control-stroke-default'
            : 'not-focus-within:border-gradient-elevation-text-control-border focus-within:inner-border-control-stroke-default',
        ],
        appearance === 'pill' &&
          'inner-border-control-stroke-default h-36 rounded-circular px-16 py-8 motion-search-box-focus-state',
        appearance === 'taskbar' &&
          'inner-border-control-stroke-default h-control-height rounded-circular px-16 py-6 motion-search-box-focus-state',
        className,
      )}
    >
      {!isDefault && <SearchIcons isDisabled={isDisabled} />}
      <Input
        {...inputProps}
        type="text"
        role="searchbox"
        disabled={isDisabled}
        className="min-w-0 flex-1 truncate type-body text-text-fill-primary outline-none placeholder:text-text-fill-secondary disabled:text-text-fill-disabled disabled:placeholder:text-text-fill-disabled"
      />
      {isDefault && (
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'size-icon-16 shrink-0',
            isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
          )}
        />
      )}
      {isDefault && (
        // 아래쪽 강조선(피그마 bottom border, 양쪽 늘이기 + 아래 붙임). 포커스일 때 강조색 2px, disabled일 때 1px 회색 선이다.
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0',
            isDisabled
              ? 'h-stroke-default bg-control-stroke-default'
              : 'hidden group-focus-within:block group-focus-within:h-stroke-focus-outer group-focus-within:bg-accent-fill-default',
          )}
        />
      )}
    </div>
  );
}

/**
 * pill·taskbar의 돋보기를 그린다. 회색 돋보기와 컬러 돋보기(icon-color/Search)를 겹쳐 두고,
 * 상자에 마우스를 올리거나 포커스하면 컬러, 둘 다 아니면 회색이 되도록 투명도만 바꾼다. disabled면 늘 회색이다.
 * 들어갈 때 페이드, 나올 때 즉시는 motion-search-icon-state가 맡는다.
 * @codocs [[검색:입력칸]]
 * @param props 돋보기 속성
 * @param props.isDisabled disabled 여부
 * @returns 겹친 두 돋보기
 */
function SearchIcons({ isDisabled }: { isDisabled: boolean }): JSX.Element {
  return (
    <span className="grid size-icon-16 shrink-0">
      <Asset
        name="icons/ic_fluent_search_16_regular.svg"
        className={cn(
          'col-start-1 row-start-1 size-icon-16',
          isDisabled
            ? 'text-text-fill-disabled'
            : 'text-text-fill-secondary motion-search-icon-state group-focus-within:opacity-0 group-hover:opacity-0',
        )}
      />
      {!isDisabled && (
        <Asset
          name="illustrations/icon-color-search.svg"
          className="col-start-1 row-start-1 size-icon-16 opacity-0 motion-search-icon-state group-focus-within:opacity-100 group-hover:opacity-100"
        />
      )}
    </span>
  );
}
