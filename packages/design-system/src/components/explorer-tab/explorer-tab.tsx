import { Tabs } from '@base-ui/react/tabs';
import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type ExplorerTabProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  isSelected?: boolean;
  icon: ReactNode;
  title?: string;
  hasSeparator?: boolean;
  value: number;
  closeLabel?: string;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 탐색기 제목 표시줄의 폴더 탭(피그마 ExplorerTab)을 그린다. 크기는 Windows가 정한 220×32로 고정한다.
 * Rest·Hover·Selected 모양은 선택 여부(isSelected)와 CSS hover로 바꾼다. Rest에만 오른쪽 구분선이 있고 Hover·Selected에서는 없다. 선택된 탭 바로 왼쪽 탭은 쓰는 곳이 `hasSeparator`를 꺼 구분선을 없앤다.
 * 탭 묶음(바깥 상자) 안에 Base UI `Tabs.Tab`(아이콘과 제목)과 닫기 버튼을 형제로 둔다. 탭 안에 버튼을 넣으면 대화형 요소가
 * 겹치기 때문이다. 바깥 상자가 생김새와 누르기 동작(`onClick` 등)을 갖는다. 그래서 탭 줄(`Tabs.List`) 안에서만 쓴다.
 * 닫기 버튼은 마우스 전용이다(`tablist`에는 탭만 있어야 한다). 키보드는 탭에서 Delete로 닫는다(쓰는 곳이 `onKeyDown`으로 받는다).
 * 눌러도 포커스를 가져오지 않는다.
 * @codocs [[접근성:역할]]
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.isSelected 피그마 State=Selected. 지금 고른 탭이면 바탕을 깐다
 * @param props.icon 탭 앞 16px 폴더 아이콘이다. 탭마다 다르므로 필수다(피그마 ExplorerTab에는 아직 교체 속성이 없다)
 * @param props.title 피그마 TEXT 속성 Title. 탭에 보일 폴더 이름이다
 * @param props.hasSeparator 피그마 불리언 속성 Has separator. 선택되지 않은 탭 오른쪽의 구분선을 그린다
 * @param props.closeLabel 닫기 버튼의 이름. 버튼은 마우스 전용이라 보조 기술에는 드러나지 않는다
 * @param props.onClose 닫기 버튼을 눌렀을 때 부른다. 탭 자체의 onClick은 부르지 않는다
 * @param props.value Base UI 탭 값. 탭 줄(`Tabs.Root`)의 값과 같으면 선택된 탭으로 알린다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function ExplorerTab({
  isSelected = false,
  icon,
  title = '폴더 이름',
  hasSeparator = true,
  closeLabel = '탭 닫기',
  onClose,
  value,
  className,
  ...divProps
}: ExplorerTabProps): JSX.Element {
  return (
    <div
      {...divProps}
      // 오른쪽 구분선을 그리는 상태다.
      data-separator={!isSelected && hasSeparator}
      className={cn(
        'group relative flex h-size-control-height w-size-explorer-tab-width items-center gap-spacing-sm rounded-t-radius-overlay py-spacing-sm pr-spacing-sm pl-spacing-md select-none',
        'motion-control-state',
        isSelected ? 'bg-color-gray-4' : 'bg-color-white-0 hover:bg-color-black-4',
        className,
      )}
    >
      <Tabs.Tab
        value={value}
        nativeButton={false}
        render={<div />}
        // @codocs [[접근성:역할]]
        // 탭에서 Delete로 닫을 수 있다고 알린다(키 처리는 useTabStrip).
        aria-keyshortcuts="Delete"
        className={cn(
          'flex min-w-size-none flex-flex-fill items-center gap-spacing-sm rounded-radius-control',
          'focus-visible:outline-stroke-width-focus-outer focus-visible:outline-color-black-89 focus-visible:outline-solid',
        )}
      >
        <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
          {icon}
        </span>
        <span className="min-w-size-none flex-flex-fill truncate type-caption text-color-black-89">
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
        className="inline-flex size-size-icon-sm shrink-shrink-none items-center justify-center text-color-black-61"
      >
        <Asset name="icons/ic_fluent_dismiss_20_regular.svg" className="size-size-icon-sm" />
      </button>
      {!isSelected && hasSeparator && (
        <span
          aria-hidden
          className="absolute top-position-half right-spacing-none h-size-separator-height w-stroke-stroke-width-default -translate-y-position-half bg-color-black-8 group-hover:hidden"
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
