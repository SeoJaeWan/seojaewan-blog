import { Tabs } from '@base-ui/react/tabs';
import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BrowserTabProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State=Active. 지금 고른 탭이면 툴바색 바탕을 깐다 */
  active?: boolean;
  /** 탭 앞 16px 파비콘이다. 탭마다 다르므로 필수다(피그마 `Favicon` 인스턴스 교체 속성) */
  favicon: ReactNode;
  /** 피그마 TEXT 속성 Title. 탭에 보일 페이지 제목이다 */
  title?: string;
  /** 피그마 인스턴스 교체 속성 Close icon. 기본은 피그마 기본 인스턴스(닫기)다 */
  closeIcon?: ReactNode;
  /** 피그마 불리언 속성 Show separator. 선택되지 않은 탭 오른쪽의 구분선을 그린다 */
  showSeparator?: boolean;
  /** Base UI 탭 값. 탭 줄(`Tabs.Root`)의 값과 같으면 선택된 탭으로 알린다 */
  value: number;
  /** 닫기 버튼의 이름. 버튼은 마우스 전용이라 보조 기술에는 드러나지 않는다 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 탭 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Chrome 탭 하나(피그마 BrowserTab)를 그린다. 크기는 Windows가 정한 240×34로 고정한다.
 * Rest·Hover·Active 모양은 선택 여부(active)와 CSS hover로 바꾼다. 닫기 아이콘 자리는 같은 크기의 버튼이다.
 * 탭 묶음(바깥 상자) 안에 Base UI `Tabs.Tab`(파비콘과 제목)과 닫기 버튼을 형제로 둔다. 탭 안에 버튼을 넣으면 대화형 요소가
 * 겹치기 때문이다. 바깥 상자가 생김새와 누르기 동작(`onClick` 등)을 갖는다. 그래서 탭 줄(`Tabs.List`) 안에서만 쓴다.
 * 닫기 버튼은 마우스 전용이다(`tablist`에는 탭만 있어야 한다). 키보드는 탭에서 Delete로 닫는다(쓰는 곳이 `onKeyDown`으로 받는다).
 * 눌러도 포커스를 가져오지 않는다.
 * @codocs [[접근성:역할]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function BrowserTab(props: BrowserTabProps): JSX.Element {
  const {
    active: isActive = false,
    favicon,
    title = '페이지 제목',
    closeIcon = (
      <Asset name="icons/ic_fluent_dismiss_20_regular.svg" className="size-size-icon-sm" />
    ),
    showSeparator: hasSeparator = true,
    closeLabel = '탭 닫기',
    onClose,
    value,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      // 오른쪽 구분선을 그리는 상태다.
      data-separator={!isActive && hasSeparator}
      className={cn(
        'group relative flex h-size-browser-tab-height w-size-browser-tab-width items-center gap-spacing-sm py-spacing-none pr-spacing-sm pl-spacing-md select-none',
        'motion-control-state',
        isActive
          ? 'rounded-t-radius-overlay bg-chrome-toolbar-fill'
          : 'rounded-t-radius-overlay bg-transparent hover:rounded-radius-overlay hover:bg-chrome-tab-fill-hover',
        className,
      )}
    >
      <Tabs.Tab
        value={value}
        nativeButton={false}
        render={<div />}
        className={cn(
          'flex min-w-size-none flex-flex-fill items-center gap-spacing-sm rounded-radius-control',
          'focus-visible:outline-stroke-width-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        )}
      >
        <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center">
          {favicon}
        </span>
        <span className="min-w-size-none flex-flex-fill truncate type-caption text-chrome-text-primary">
          {title}
        </span>
      </Tabs.Tab>
      <button
        type="button"
        aria-hidden
        aria-label={closeLabel}
        tabIndex={-1}
        onMouseDown={handleCloseMouseDown}
        onClick={(event) => {
          event.stopPropagation();
          onClose?.(event);
        }}
        className="inline-flex size-size-icon-sm shrink-shrink-none items-center justify-center text-chrome-text-secondary"
      >
        {closeIcon}
      </button>
      {!isActive && hasSeparator && (
        <span
          aria-hidden
          className="absolute top-position-half right-spacing-none h-size-separator-height w-stroke-stroke-width-default -translate-y-position-half bg-chrome-tab-separator group-hover:hidden"
        />
      )}
    </div>
  );
}

/**
 * 닫기 버튼을 눌러도 포커스를 옮기지 않는다. 버튼은 마우스 전용이고 곧 사라진다.
 * @param event 누르기 이벤트
 */
function handleCloseMouseDown(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}
