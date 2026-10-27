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
  /** 닫기 버튼의 접근성 이름 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 탭 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Chrome 탭 하나(피그마 BrowserTab)를 그린다. 크기는 Windows가 정한 240×34로 고정한다.
 * Rest·Hover·Active 모양은 선택 여부(active)와 CSS hover로 바꾼다. 닫기 아이콘 자리는 같은 크기의 버튼이다.
 * 탭 묶음(바깥 상자) 안에 탭(`role="tab"`, 파비콘과 제목)과 닫기 버튼을 형제로 둔다. 탭 안에 버튼을 넣으면 대화형 요소가
 * 겹치기 때문이다. 바깥 상자가 생김새와 누르기 동작(`onClick` 등)을 갖고, `tabIndex`는 탭이 받는다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function BrowserTab(props: BrowserTabProps): JSX.Element {
  const {
    active: isActive = false,
    favicon,
    title = '페이지 제목',
    closeIcon = <Asset name="icons/ic_fluent_dismiss_20_regular.svg" className="size-icon-16" />,
    showSeparator: hasSeparator = true,
    closeLabel = '탭 닫기',
    onClose,
    className,
    tabIndex,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'group relative flex h-34 w-240 items-center gap-8 py-0 pr-8 pl-12 select-none',
        'motion-control-state',
        isActive
          ? 'rounded-t-overlay bg-chrome-toolbar-fill'
          : 'rounded-t-overlay bg-transparent hover:rounded-overlay hover:bg-chrome-tab-fill-hover',
        className,
      )}
    >
      <div
        role="tab"
        aria-selected={isActive}
        tabIndex={tabIndex}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-8 rounded-control',
          'focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        )}
      >
        <span className="flex size-icon-16 shrink-0 items-center justify-center">{favicon}</span>
        <span className="min-w-0 flex-1 truncate type-caption text-chrome-text-primary">
          {title}
        </span>
      </div>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClose?.(event);
        }}
        className="inline-flex size-icon-16 shrink-0 items-center justify-center text-chrome-text-secondary"
      >
        {closeIcon}
      </button>
      {!isActive && hasSeparator && (
        <span
          aria-hidden
          className="absolute top-1/2 right-0 h-16 w-stroke-default -translate-y-1/2 bg-chrome-tab-separator group-hover:hidden"
        />
      )}
    </div>
  );
}
