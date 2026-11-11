import { Menu } from '@base-ui/react/menu';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { type JSX, useRef } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { Tooltip } from '../tooltip/tooltip';

type MenuCommandButtonProps = {
  label: string;
  icon: SvgAssetName;
  shortcut?: string;
  onClick?: () => void;
  className?: string;
};

// 마우스·키보드로 강조된 항목은 Base UI가 data-highlighted를 단다. 누르는 중에는 글자만 흐려지고 아이콘 색은 그대로다.
const buttonClassName = cn(
  'group flex h-size-menu-command-button-height w-size-menu-command-button-width shrink-shrink-none flex-col items-center justify-center gap-spacing-xs rounded-radius-control px-spacing-xs py-spacing-sm-nudge',
  'bg-color-white-0 text-color-black-89 outline-none select-none cursor-default motion-control-state',
  'data-highlighted:bg-color-black-4 active:data-highlighted:bg-color-black-2',
);

// 툴팁과 단추 사이 간격은 팝업 규칙대로 spacing/xs(4px) 하나다.
const TOOLTIP_OFFSET = 4;

/**
 * 메뉴 위·아래 단추 줄에 놓는 명령 단추(피그마 MenuCommandButton)를 그린다. 아이콘 아래에 글자를 둔다.
 * Base UI Menu의 Popup 안에 두며, `Menu.Item`이 키보드 조작·접근성·누르면 메뉴 닫기를 맡는다.
 * 마우스를 올리면 호버 지연 뒤에, 키보드(방향키)로 닿으면 바로 Base UI Tooltip이 `이름 (단축키)` 말풍선(Tooltip)을 띄운다.
 * 크기는 너비 64px·높이 48px로 고정이다(토큰 `size/menu-command-button/width`·`height`). 줄(MenuCommandBar)이 넓어져도 단추는 늘어나지 않는다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:팝업]]
 * @param props 컴포넌트 속성
 * @param props.label 명령 이름. 아이콘 아래에 보이고 말풍선의 이름이 된다(피그마 Label)
 * @param props.icon 이름 위에 그릴 16px 아이콘(피그마 Icon)
 * @param props.shortcut 말풍선에 이름 뒤 괄호로 보이는 단축키(예: `Ctrl+X`)
 * @param props.onClick 단추를 골랐을 때 호출
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function MenuCommandButton({
  label,
  icon,
  shortcut,
  onClick: handleClick,
  className,
}: MenuCommandButtonProps): JSX.Element {
  const tooltipText = shortcut === undefined ? label : `${label} (${shortcut})`;

  // 포인터가 이 단추 위에 있는지. Base UI 메뉴는 마우스가 움직인(mousemove) 항목에 포커스를 옮기는데,
  // pointermove가 mousemove보다 먼저 오므로 포커스가 옮겨 오기 전에 표시된다.
  const isPointerInsideRef = useRef(false);

  /**
   * 포커스로 열리는 툴팁은 키보드(방향키)로 닿았을 때만 띄운다. 마우스로 강조해도 Base UI 메뉴가 그 항목에 포커스를 옮겨,
   * 그대로 두면 마우스를 올리자마자 지연 없이 뜨기 때문이다. 마우스로는 호버 지연 뒤에 뜬다.
   * 마우스로 강조한 항목도 `:focus-visible`이 되어 포커스 모양으로는 가를 수 없으므로 포인터 위치로 가른다.
   * @param isOpen 열림 여부
   * @param eventDetails 열림 이유와 취소 함수
   */
  function handleOpenChange(
    isOpen: boolean,
    eventDetails: BaseTooltip.Root.ChangeEventDetails,
  ): void {
    if (isOpen && eventDetails.reason === 'trigger-focus' && isPointerInsideRef.current) {
      eventDetails.cancel();
    }
  }

  /** 포인터가 단추 위에서 움직이면 표시한다 */
  function handlePointerMove(): void {
    isPointerInsideRef.current = true;
  }

  /** 포인터가 단추를 떠나면 표시를 지운다 */
  function handlePointerLeave(): void {
    isPointerInsideRef.current = false;
  }

  return (
    <BaseTooltip.Root onOpenChange={handleOpenChange}>
      <BaseTooltip.Trigger
        render={
          <Menu.Item
            label={label}
            onClick={handleClick}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className={cn(buttonClassName, className)}
          />
        }
      >
        <Asset name={icon} className="size-size-icon-sm shrink-shrink-none" />
        <span className="type-caption group-active:group-data-highlighted:text-color-black-61">
          {label}
        </span>
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side="bottom" sideOffset={TOOLTIP_OFFSET}>
          <BaseTooltip.Popup render={<Tooltip text={tooltipText} />} />
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
