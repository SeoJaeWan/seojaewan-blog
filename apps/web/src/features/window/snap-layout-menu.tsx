import type { JSX } from 'react';

import { CaptionButton, Popover, SnapLayoutFlyout } from '@seojaewan/design-system';

type SnapLayoutMenuProps = {
  /** 스냅 레이아웃 선택지가 열렸는지. 최대화 버튼에 마우스를 올리면 여는 동작은 기능을 구현할 때 붙인다 */
  open?: boolean;
  /** 최대화 버튼을 눌렀을 때 */
  onMaximize?: () => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 창 최대화 버튼과 그 아래 가운데에 뜨는 스냅 레이아웃 선택지(피그마 조립 `Window/SnapLayoutMenu`)를 그린다.
 * 피그마 Popover(`Bottom-Center`)에 CaptionButton(최대화)과 SnapLayoutFlyout을 넣은 조립이다.
 * 칸을 고르면 창이 그 자리를 채우는 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function SnapLayoutMenu(props: SnapLayoutMenuProps): JSX.Element {
  const { open: isOpen = false, onMaximize: handleMaximize, className } = props;
  return (
    <Popover
      placement="bottom-center"
      open={isOpen}
      className={className}
      trigger={
        <CaptionButton
          label="최대화"
          icon="icons/ic_fluent_maximize_20_regular.svg"
          aria-expanded={isOpen}
          onClick={handleMaximize}
        />
      }
      popup={<SnapLayoutFlyout />}
    />
  );
}
