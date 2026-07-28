"use client";

import type {
  ComponentPropsWithoutRef,
  PointerEventHandler,
  ReactNode,
  RefObject,
  WheelEventHandler,
} from "react";

import { clsx } from "clsx";
import { motion } from "motion/react";

/** Context Menu가 기준점의 위쪽 또는 아래쪽 중 어디에 배치됐는지 나타낸다. */
export type ContextMenuPlacement = "bottom" | "top";

/** Shell이 viewport 경계를 반영해 계산한 Context Menu 좌표와 배치 방향이다. */
export interface ContextMenuPosition {
  bottom?: number;
  left?: number;
  placement: ContextMenuPlacement;
  right?: number;
  top?: number;
}

export interface ContextMenuUIProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-label" | "children" | "onContextMenu" | "onPointerDown" | "onWheel" | "role"
> {
  /** true이면 실제 배치 방향을 기준으로 opening Motion을 실행한다. 기본값은 false다. */
  animated?: boolean;
  /** 메뉴 안에 표시할 ContextMenuButtonUI 또는 sub panel trigger 목록. */
  children: ReactNode;
  /** 측정과 초기 focus를 위해 실제 menu surface DOM을 받는 ref. */
  menuRef?: RefObject<HTMLDivElement | null>;
  /** 메뉴 바깥의 blocking layer를 누르면 호출할 callback. */
  onBackdropPointerDown?: PointerEventHandler<HTMLDivElement>;
  /** null이면 크기 측정을 위한 숨겨진 surface를 렌더한다. */
  position: ContextMenuPosition | null;
}

const MENU_TRANSITION = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1],
} as const;

/**
 * viewport blocking layer, 위치 surface와 menu panel visual을 하나의 Context Menu UI로 렌더링한다.
 * 열림 상태, Portal, 좌표 계산과 action 실행은 이 UI를 조립하는 기능 계층이 소유한다.
 *
 * @param props.animated 실제 배치 방향을 기준으로 opening Motion을 실행할지 여부
 * @param props.children menu surface 안에 표시할 action row 목록
 * @param props.menuRef 기능 계층이 surface를 측정하고 focus할 때 사용하는 ref
 * @param props.onBackdropPointerDown menu 바깥의 blocking layer pointer callback
 * @param props.position 계산된 viewport 좌표와 위·아래 배치 방향. null이면 숨겨진 측정 상태
 * @param props.className 전체 viewport layer에 추가할 className
 */
export const ContextMenuUI = ({
  animated = false,
  children,
  className,
  menuRef,
  onBackdropPointerDown,
  position,
  ...props
}: ContextMenuUIProps) => {
  const hiddenClipPath = position?.placement === "top" ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";
  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    if (event.target === event.currentTarget) {
      onBackdropPointerDown?.(event);
    }
  };
  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    if (event.target === event.currentTarget) {
      event.preventDefault();
    }
  };
  const surfaceStyle =
    position === null
      ? undefined
      : {
          bottom: position.bottom,
          left: position.left,
          right: position.right,
          top: position.top,
        };

  return (
    <div
      {...props}
      className={clsx("wb-context-menu", className)}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
    >
      {position === null ? (
        <div
          aria-hidden="true"
          className="wb-context-menu__surface"
          data-measuring="true"
          ref={menuRef}
          style={{ left: 0, top: 0 }}
        >
          {children}
        </div>
      ) : (
        <motion.div
          animate={{ clipPath: "inset(0 0 0 0)", opacity: 1 }}
          aria-label="컨텍스트 메뉴"
          className="wb-context-menu__surface"
          data-placement={position.placement}
          initial={animated ? { clipPath: hiddenClipPath, opacity: 0 } : false}
          ref={menuRef}
          role="menu"
          style={surfaceStyle}
          transition={MENU_TRANSITION}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};
