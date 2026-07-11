import type { ComponentPropsWithoutRef, MouseEvent, PointerEvent } from "react";

import {
  Dismiss16Regular,
  Maximize16Regular,
  SquareMultiple16Regular,
  Subtract16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

export interface WindowControlsProps extends ComponentPropsWithoutRef<"div"> {
  /** true이면 maximize 버튼을 restore label/icon으로 바꾼다. 기본값은 false이다. */
  fullscreen?: boolean;
  /** 닫기 버튼 클릭 시 호출한다. */
  onClose?: () => void;
  /** 최소화 버튼 클릭 시 호출한다. */
  onMinimize?: () => void;
  /** 최대화/복원 버튼 클릭 시 호출한다. */
  onToggleFullscreen?: () => void;
  /** 원본 other 타입 세션은 닫기만 표시한다 */
  showMaximize?: boolean;
  /** false이면 최소화 버튼을 숨긴다. 기본값은 true이다. */
  showMinimize?: boolean;
}

/**
 * 창 우측 상단의 최소화/최대화(복원)/닫기 버튼 (원본 30x30, md 미만에서는 닫기만).
 * pointerdown 전파를 막아 control 클릭이 배경 창 activate나 drag 시작으로 번지지 않게 한다.
 *
 * @param props.fullscreen true이면 maximize 버튼을 restore label/icon으로 바꾼다
 * @param props.onMinimize 최소화 버튼 클릭을 앱 세션 상태로 위임하는 callback
 * @param props.onToggleFullscreen 최대화/복원 버튼 클릭을 앱 세션 상태로 위임하는 callback
 * @param props.onClose 닫기 버튼 클릭을 앱 세션 상태로 위임하는 callback
 * @param props.showMinimize false이면 최소화 버튼을 숨긴다
 * @param props.showMaximize false이면 최대화/복원 버튼을 숨긴다
 */
export const WindowControls = ({
  className,
  fullscreen = false,
  onClose,
  onMinimize,
  onPointerDown,
  onToggleFullscreen,
  showMaximize = true,
  showMinimize = true,
  ...props
}: WindowControlsProps) => {
  // 컨트롤 클릭이 배경 창 activate(pointer down)로 번지지 않게 막는다
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPointerDown?.(event);
  };

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClose?.();
  };

  return (
    <div
      className={clsx("wb-window-controls", className)}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {showMinimize ? (
        <button
          aria-label="최소화"
          className="wb-window-controls__button wb-window-controls__button--minimize"
          onClick={onMinimize}
          type="button"
        >
          <Subtract16Regular aria-hidden="true" />
        </button>
      ) : null}
      {showMaximize ? (
        <button
          aria-label={fullscreen ? "이전 크기로 복원" : "최대화"}
          className="wb-window-controls__button wb-window-controls__button--maximize"
          onClick={onToggleFullscreen}
          type="button"
        >
          {fullscreen ? (
            <SquareMultiple16Regular aria-hidden="true" />
          ) : (
            <Maximize16Regular aria-hidden="true" />
          )}
        </button>
      ) : null}
      <button
        aria-label="닫기"
        className="wb-window-controls__button wb-window-controls__button--close"
        onClick={handleClose}
        type="button"
      >
        <Dismiss16Regular aria-hidden="true" />
      </button>
    </div>
  );
};
