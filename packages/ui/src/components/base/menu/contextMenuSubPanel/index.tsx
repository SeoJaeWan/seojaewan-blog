import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export interface ContextMenuSubPanelPlacement {
  /** viewport 하단 overflow 시 bottom 기준으로 붙이는 값. */
  bottom?: number;
  /** viewport 우측 overflow 시 부모 row 왼쪽으로 플립하기 위한 left 기준값. */
  left?: number;
  /** 기본 배치에서 부모 row 오른쪽에 붙이기 위한 right 기준값. */
  right?: number;
  /** viewport 하단 overflow가 없을 때 부모 row top에 맞추는 값. */
  top?: number;
  /** 부모 row 오른쪽/왼쪽 어느 방향으로 panel을 밀지 결정하는 translateX 값. */
  transform: string;
}

/** ContextMenuSubPanel의 시각적 열림 상태와 배치를 전달하는 props. */
export interface ContextMenuSubPanelProps extends ComponentPropsWithRef<"div"> {
  /** true이면 panel surface를 표시한다. */
  open?: boolean;
  /** 부모 row를 기준으로 계산된 panel inset과 가로 이동 값. */
  placement?: ContextMenuSubPanelPlacement;
}

const defaultPlacement: ContextMenuSubPanelPlacement = {
  right: 0,
  top: 0,
  transform: "translateX(100%)",
};

/**
 * 컨텍스트 메뉴 row에 붙는 서브 메뉴 surface를 렌더링한다.
 * 열림 여부와 placement는 이 visual을 조립하는 기능 계층이 계산해 전달한다.
 *
 * @param props.children 서브 메뉴 안에 표시할 action row 목록
 * @param props.className 서브 메뉴 surface에 추가할 className
 * @param props.open panel surface 표시 여부. 기본값은 false
 * @param props.placement 부모 row 기준 inset과 translateX 값. 기본값은 오른쪽/top 배치
 * @param props.ref 기능 계층이 크기와 부모 row를 측정할 panel ref
 * @param props.role panel의 접근성 role. 기본값은 "menu"
 * @param props.style placement 결과와 병합할 panel inline style
 */
export const ContextMenuSubPanel = ({
  children,
  className,
  open = false,
  placement = defaultPlacement,
  ref,
  role = "menu",
  style,
  ...props
}: ContextMenuSubPanelProps) => {
  return (
    <div
      {...props}
      aria-hidden={!open}
      className={clsx("wb-context-menu-sub-panel", className)}
      data-open={open ? "true" : "false"}
      ref={ref}
      role={role}
      style={{
        ...style,
        bottom: placement.bottom,
        left: placement.left,
        right: placement.right,
        top: placement.top,
        transform: placement.transform,
      }}
    >
      {children}
    </div>
  );
};
