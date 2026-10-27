import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, useSyncExternalStore } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

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
        'group relative isolate flex items-center justify-start gap-8 overflow-hidden inner-border-w-default',
        isDisabled
          ? 'bg-control-fill-disabled'
          : 'bg-control-fill-default focus-within:bg-control-fill-input-active hover:not-focus-within:bg-control-fill-secondary',
        isDefault &&
          'inner-border-control-stroke-default h-control-height rounded-control py-6 pr-8 pl-12 motion-control-state',
        appearance === 'pill' &&
          'inner-border-control-stroke-default h-36 rounded-circular px-16 py-8 motion-search-box-focus-state',
        appearance === 'taskbar' &&
          'inner-border-control-stroke-default h-control-height rounded-circular px-16 py-6 motion-search-box-focus-state',
        appearance === 'web' &&
          'inner-border-control-stroke-default h-36 rounded-circular px-16 py-8 motion-control-state',
        isWindowsSearch && !isDisabled && 'active:bg-control-fill-input-active',
        className,
      )}
    >
      {isWindowsSearch && <SearchIcons isDisabled={isDisabled} />}
      {appearance === 'web' && (
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'size-icon-16 shrink-0',
            isDisabled ? 'text-text-fill-disabled' : 'text-text-fill-secondary',
          )}
        />
      )}
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
 * pill·taskbar의 돋보기를 그린다. Hover·Focused에는 새 그라데이션 자산을 쓰고 Pressed에는 0.8배로 줄인다.
 * Safari 계열 WebKit에서는 그라데이션 대신 단색 강조색을 쓴다. disabled면 늘 회색이다.
 * @codocs [[검색:입력칸]]
 * @param props 돋보기 속성
 * @param props.isDisabled disabled 여부
 * @returns 겹친 두 돋보기
 */
function SearchIcons({ isDisabled }: { isDisabled: boolean }): JSX.Element {
  const shouldUseSolidIcon = useSyncExternalStore(
    subscribeBrowser,
    usesSolidSearchIcon,
    serverUsesSolidSearchIcon,
  );
  return (
    <span className="grid size-icon-16 shrink-0 place-items-center">
      <span className={cn('grid size-icon-16', !isDisabled && 'group-active:scale-80')}>
        <Asset
          name="icons/ic_fluent_search_16_regular.svg"
          className={cn(
            'col-start-1 row-start-1 size-icon-16',
            isDisabled
              ? 'text-text-fill-disabled'
              : shouldUseSolidIcon
                ? 'text-text-fill-secondary group-focus-within:text-accent-fill-default group-hover:text-accent-fill-default'
                : 'text-text-fill-secondary group-focus-within:hidden group-hover:hidden',
          )}
        />
        {!isDisabled && !shouldUseSolidIcon && (
          <Asset
            name="illustrations/icon-color-search-focus.svg"
            className="col-start-1 row-start-1 hidden size-icon-16 group-focus-within:block group-hover:block"
          />
        )}
      </span>
    </span>
  );
}

/**
 * 브라우저 종류는 실행 중 바뀌지 않아 구독할 이벤트가 없다.
 * @returns 구독 해제 함수
 */
function subscribeBrowser(): () => void {
  return () => undefined;
}

/**
 * Safari와 iOS의 WebKit 브라우저는 검색 돋보기를 단색으로 그린다.
 * @codocs [[검색:입력칸]]
 * @returns 단색 대체 여부
 */
function usesSolidSearchIcon(): boolean {
  const userAgent = navigator.userAgent;
  return (
    /AppleWebKit/u.test(userAgent) &&
    /Safari/u.test(userAgent) &&
    !/Chrome\/|Chromium\/|Edg\/|OPR\//u.test(userAgent)
  );
}

/**
 * 서버와 첫 수화에서는 같은 SVG를 사용하고 브라우저 종류는 수화 뒤 확인한다.
 * @returns 서버의 단색 대체 여부
 */
function serverUsesSolidSearchIcon(): boolean {
  return false;
}
