import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type PopoverPlacement =
  'bottom-start' | 'bottom-center' | 'bottom-end' | 'top-center' | 'top-end' | 'right-start';

type PopoverProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 팝업을 여는 요소(피그마 Trigger 슬롯). 버튼, 메뉴 항목, 입력창 등을 넣는다 */
  trigger: ReactNode;
  /** 트리거 옆에 뜨는 팝업(피그마 Popup 슬롯). 메뉴, 툴팁, 플라이아웃 등을 넣는다 */
  popup?: ReactNode;
  /** 피그마 Placement. 팝업이 트리거의 어느 쪽에 어느 끝을 맞춰 붙는지다 */
  placement?: PopoverPlacement;
  /** 피그마 State. true면 팝업을 보이고(Open), false면 트리거만 보인다(Closed) */
  open?: boolean;
};

// 자리별 팝업 위치다. 트리거와 팝업 사이 간격은 spacing/4 하나다.
const placementClassNames = {
  'bottom-start': 'top-full left-0 mt-4',
  'bottom-center': 'top-full left-1/2 mt-4 -translate-x-1/2',
  'bottom-end': 'top-full right-0 mt-4',
  'top-center': 'bottom-full left-1/2 mb-4 -translate-x-1/2',
  'top-end': 'bottom-full right-0 mb-4',
  'right-start': 'top-0 left-full ml-4',
} as const satisfies Record<PopoverPlacement, string>;

/**
 * 트리거와 그 옆에 뜨는 팝업을 묶는 틀(피그마 Popover)을 그린다. 특정 트리거와 팝업 내용은 쓰는 곳(조립)이 채우고,
 * 열고 닫는 동작과 트리거의 열림 상태(`aria-expanded`)도 쓰는 곳이 정한다.
 * 열린 팝업은 떠 있는 요소라 절대 위치로 두어, 트리거를 담은 부모의 크기와 배치를 바꾸지 않는다.
 * 절대 위치 상자는 너비가 트리거 너비로 줄지 않도록 내용 너비(w-max)를 쓴다.
 * @codocs [[디자인 시스템:팝업]]
 * @param props
 */
export function Popover(props: PopoverProps): JSX.Element {
  const {
    trigger,
    popup,
    placement = 'bottom-start',
    open: isOpen = false,
    className,
    ...divProps
  } = props;
  return (
    <div {...divProps} className={cn('relative inline-flex', className)}>
      {trigger}
      {isOpen && (
        <div className={cn('absolute z-10 flex w-max', placementClassNames[placement])}>
          {popup}
        </div>
      )}
    </div>
  );
}
