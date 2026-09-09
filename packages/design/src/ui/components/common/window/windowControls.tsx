import type { ComponentPropsWithRef, MouseEvent, PointerEvent } from "react";

import { Button } from "@base-ui/react/button";
import {
  Dismiss16Regular,
  Maximize16Regular,
  SquareMultiple16Regular,
  Subtract16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { WindowFrameMode } from "./windowFrame.js";

import "./windowControls.css";

/** Common Window controls의 controlled 상태와 intent callback이다. */
export type WindowControlsProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** restore icon과 accessible name을 선택한다. */
    maximized: boolean;
    /** desktop 전체 controls와 mobile 닫기 전용 구성을 선택한다. */
    mode: WindowFrameMode;
    /** 정확한 Session을 닫는 상위 Action을 호출한다. */
    onClose?: () => void;
    /** 같은 Session을 최소화하는 상위 Action을 호출한다. */
    onMinimize?: () => void;
    /** 같은 Session의 maximize/restore 상위 Action을 호출한다. */
    onToggleMaximized?: () => void;
  }>;

/** control pointer 입력이 titlebar move 시작으로 전달되지 않게 막는다. */
const stopControlPointerPropagation = (event: PointerEvent<HTMLDivElement>) => {
  event.stopPropagation();
};

/** control click의 전파를 막은 뒤 전달받은 제품 intent를 한 번 호출한다. */
const invokeControlAction = (event: MouseEvent<HTMLButtonElement>, action?: () => void) => {
  event.stopPropagation();
  action?.();
};

/**
 * desktop의 최소화·최대화/복원·닫기와 mobile의 닫기 전용 controls를 렌더링한다.
 *
 * Base UI Button의 keyboard activation을 사용하며 Session commit이나 motion 순서는 소유하지 않는다.
 */
export const WindowControls = ({
  className,
  maximized,
  mode,
  onClose,
  onMinimize,
  onPointerDown,
  onToggleMaximized,
  ...props
}: WindowControlsProps) => {
  /** caller callback과 내부 drag 차단을 같은 pointer boundary에서 적용한다. */
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    stopControlPointerPropagation(event);
    onPointerDown?.(event);
  };

  return (
    <div
      {...props}
      className={clsx("window-controls", className)}
      data-mode={mode}
      onPointerDown={handlePointerDown}
    >
      {mode === "desktop" ? (
        <>
          <Button
            aria-label="최소화"
            className="window-controls__button"
            onClick={(event) => invokeControlAction(event, onMinimize)}
            type="button"
          >
            <Subtract16Regular aria-hidden="true" />
          </Button>
          <Button
            aria-label={maximized ? "이전 크기로 복원" : "최대화"}
            className="window-controls__button"
            onClick={(event) => invokeControlAction(event, onToggleMaximized)}
            type="button"
          >
            {maximized ? (
              <SquareMultiple16Regular aria-hidden="true" />
            ) : (
              <Maximize16Regular aria-hidden="true" />
            )}
          </Button>
        </>
      ) : null}
      <Button
        aria-label="닫기"
        className="window-controls__button window-controls__button--close"
        onClick={(event) => invokeControlAction(event, onClose)}
        type="button"
      >
        <Dismiss16Regular aria-hidden="true" />
      </Button>
    </div>
  );
};
