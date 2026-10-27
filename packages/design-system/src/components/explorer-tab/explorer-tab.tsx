import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type ExplorerTabProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State=Selected. 지금 고른 탭이면 바탕을 깐다 */
  selected?: boolean;
  /** 탭 앞 16px 폴더 아이콘이다. 탭마다 다르므로 필수다(피그마 ExplorerTab에는 아직 교체 속성이 없다) */
  icon: ReactNode;
  /** 피그마 TEXT 속성 Title. 탭에 보일 폴더 이름이다 */
  title?: string;
  /** 닫기 버튼의 접근성 이름 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 탭 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 탐색기 제목 표시줄의 폴더 탭(피그마 ExplorerTab)을 그린다. 크기는 Windows가 정한 220×32로 고정한다.
 * Rest·Hover·Selected 모양은 선택 여부(selected)와 CSS hover로 바꾼다.
 * 탭 묶음(바깥 상자) 안에 탭(`role="tab"`, 아이콘과 제목)과 닫기 버튼을 형제로 둔다. 탭 안에 버튼을 넣으면 대화형 요소가
 * 겹치기 때문이다. 바깥 상자가 생김새와 누르기 동작(`onClick` 등)을 갖고, `tabIndex`는 탭이 받는다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function ExplorerTab(props: ExplorerTabProps): JSX.Element {
  const {
    selected: isSelected = false,
    icon,
    title = '폴더 이름',
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
        'flex h-control-height w-220 items-center gap-8 rounded-t-overlay py-8 pr-8 pl-12 select-none',
        'motion-control-state',
        isSelected
          ? 'bg-layer-on-mica-base-alt-fill-default'
          : 'bg-subtle-fill-transparent hover:bg-layer-on-mica-base-alt-fill-secondary',
        className,
      )}
    >
      <div
        role="tab"
        aria-selected={isSelected}
        tabIndex={tabIndex}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-8 rounded-control',
          'focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        )}
      >
        <span className="flex size-icon-16 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate type-caption text-text-fill-primary">{title}</span>
      </div>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClose?.(event);
        }}
        className="inline-flex size-icon-16 shrink-0 items-center justify-center text-text-fill-secondary"
      >
        <Asset name="icons/ic_fluent_dismiss_20_regular.svg" className="size-icon-16" />
      </button>
    </div>
  );
}
