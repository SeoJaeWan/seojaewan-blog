import { Popover as BasePopover } from '@base-ui/react/popover';
import type { JSX } from 'react';
import { useState } from 'react';

import {
  CaptionButton,
  cn,
  SnapLayoutFlyout,
  type SnapLayoutOptionLayout,
} from '@seojaewan/design-system';

type SnapLayoutMenuProps = {
  isInactive?: boolean;
  onMaximize?: () => void;
  onSelectZone?: (layout: SnapLayoutOptionLayout, index: number) => void;
  className?: string;
};

// 최대화 버튼과 선택지 사이 간격(px)이다.
const FLYOUT_OFFSET = 4;

// 선택지가 열려 있는 동안(aria-expanded) 최대화 버튼을 CaptionButton Hover 모습(바탕 subtle-fill/secondary, 아이콘
// text-fill/primary)으로 둔다. 선택지는 마우스를 올려 여는 팝업이라 그동안 마우스가 버튼 위에 있다고 보기 때문이다.
const OPEN_TRIGGER_CLASS_NAME = 'aria-expanded:bg-color-black-4 aria-expanded:text-color-black-89';

/**
 * 창 최대화 버튼과 그 아래 가운데에 뜨는 스냅 레이아웃 선택지(피그마 조립 `Window/SnapLayoutMenu`)를 그린다.
 * 피그마 조립은 닫힌 Popover(`Bottom center`)에 CaptionButton(최대화)을 넣은 모양이고, 열린 선택지(SnapLayoutFlyout)는 실행 중에만 뜬다(`@runtime`).
 * 최대화 버튼에 마우스를 올리면 선택지를 열고(Base UI Popover의 hover 열기), 칸을 고르면 닫고 쓰는 곳에 알린다.
 * 버튼을 누르면 최대화한다. 선택지가 열려 있는 동안 최대화 버튼은 CaptionButton Hover 모습이다(피그마 조립의 닫힌 모양은 Rest이고, 이 Hover 모습은 실행 중에만 나온다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[스냅:스냅 레이아웃]]
 * @param props 컴포넌트 속성
 * @param props.isInactive 피그마 State=Inactive. 창이 활성 상태가 아니면 최대화 버튼 아이콘을 흐리게 그린다
 * @param props.onMaximize 최대화 버튼을 눌렀을 때
 * @param props.onSelectZone 스냅 칸을 골랐을 때(레이아웃과 칸 번호)
 * @param props.className 바깥 배치 클래스
 */
export function SnapLayoutMenu({
  isInactive = false,
  onMaximize: handleMaximize,
  onSelectZone: handleZoneChoice,
  className,
}: SnapLayoutMenuProps): JSX.Element {
  const [isHoverOpen, setIsHoverOpen] = useState(false);

  /**
   * 칸을 고르면 선택지를 닫고 쓰는 곳에 알린다.
   * @param layout 레이아웃
   * @param index 칸 번호
   */
  function handleSelectZone(layout: SnapLayoutOptionLayout, index: number): void {
    setIsHoverOpen(false);
    handleZoneChoice?.(layout, index);
  }

  /**
   * 마우스를 올리거나 바깥을 누르면 Base UI가 알려 주는 대로 선택지를 열고 닫는다.
   * @param isOpen 열지
   */
  function handleOpenChange(isOpen: boolean): void {
    setIsHoverOpen(isOpen);
  }

  /** 최대화 버튼을 누르면 선택지를 닫고 최대화한다. */
  function handleMaximizeClick(): void {
    setIsHoverOpen(false);
    handleMaximize?.();
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <BasePopover.Root open={isHoverOpen} onOpenChange={handleOpenChange}>
        <BasePopover.Trigger
          openOnHover
          render={
            <CaptionButton
              label="최대화"
              icon="icons/ic_fluent_maximize_20_regular.svg"
              isInactive={isInactive}
              className={OPEN_TRIGGER_CLASS_NAME}
              onClick={handleMaximizeClick}
            />
          }
        />
        <BasePopover.Portal>
          <BasePopover.Positioner side="bottom" align="center" sideOffset={FLYOUT_OFFSET}>
            <BasePopover.Popup aria-label="스냅 레이아웃" className="outline-none">
              <SnapLayoutFlyout onSelectZone={handleSelectZone} />
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    </div>
  );
}
