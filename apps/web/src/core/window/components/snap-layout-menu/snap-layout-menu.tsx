import { Popover as BasePopover } from '@base-ui/react/popover';
import type { JSX } from 'react';
import { useState } from 'react';

import {
  CaptionButton,
  Popover,
  SnapLayoutFlyout,
  type SnapLayoutOptionLayout,
} from '@seojaewan/design-system';

type SnapLayoutMenuProps = {
  /**
   * 스냅 레이아웃 선택지를 연 모습으로 고정한다(피그마 조립 스토리). 주지 않으면 최대화 버튼에 마우스를 올렸을 때 열고,
   * 선택지는 창 밖으로 나가도 잘리지 않도록 문서 맨 위(포털)에 띄운다
   */
  open?: boolean;
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 최대화 버튼 아이콘을 흐리게 그린다 */
  inactive?: boolean;
  /** 최대화 버튼을 눌렀을 때 */
  onMaximize?: () => void;
  /** 스냅 칸을 골랐을 때(레이아웃과 칸 번호) */
  onSelectZone?: (layout: SnapLayoutOptionLayout, index: number) => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

// 최대화 버튼과 선택지 사이 간격(px)이다. 고정 모습(Popover)의 mt-4와 같다.
const FLYOUT_OFFSET = 4;

/**
 * 창 최대화 버튼과 그 아래 가운데에 뜨는 스냅 레이아웃 선택지(피그마 조립 `Window/SnapLayoutMenu`)를 그린다.
 * 피그마 Popover(`Bottom-Center`)에 CaptionButton(최대화)과 SnapLayoutFlyout을 넣은 조립이다.
 * 최대화 버튼에 마우스를 올리면 선택지를 열고(Base UI Popover의 hover 열기), 칸을 고르면 닫고 쓰는 곳에 알린다.
 * 버튼을 누르면 최대화한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function SnapLayoutMenu(props: SnapLayoutMenuProps): JSX.Element {
  const {
    open: isFixedOpen,
    inactive: isInactive = false,
    onMaximize: handleMaximize,
    onSelectZone: handleZoneChoice,
    className,
  } = props;
  const [isHoverOpen, setIsHoverOpen] = useState(false);

  if (isFixedOpen !== undefined) {
    return (
      <Popover
        placement="bottom-center"
        open={isFixedOpen}
        className={className}
        trigger={
          <CaptionButton
            label="최대화"
            icon="icons/ic_fluent_maximize_20_regular.svg"
            inactive={isInactive}
            aria-expanded={isFixedOpen}
            onClick={handleMaximize}
          />
        }
        popup={<SnapLayoutFlyout onSelectZone={handleZoneChoice} />}
      />
    );
  }

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
    <div className={['relative inline-flex', className].filter(Boolean).join(' ')}>
      <BasePopover.Root open={isHoverOpen} onOpenChange={handleOpenChange}>
        <BasePopover.Trigger
          openOnHover
          render={
            <CaptionButton
              label="최대화"
              icon="icons/ic_fluent_maximize_20_regular.svg"
              inactive={isInactive}
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
