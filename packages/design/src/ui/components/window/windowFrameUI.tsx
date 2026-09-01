import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clsx } from "clsx";

import { WindowFrameUIInteractionContext } from "./windowFrameUIContext";
import { WindowResizeHandlesUI } from "./windowResizeHandlesUI";
import type {
  WindowFrameUICommittedBounds,
  WindowFrameUIProps,
  WindowResizeUIDirection,
} from "./windowUI.types";

import "./windowUI.css";

const toPixelValue = (value: number | undefined) =>
  value === undefined ? undefined : `${value}px`;

interface WindowFrameUIGesture {
  direction?: WindowResizeUIDirection;
  kind: "move" | "resize";
  pointerId: number;
  startBounds: WindowFrameUICommittedBounds;
  startClientX: number;
  startClientY: number;
}

const readRenderedBounds = (target: HTMLElement): WindowFrameUICommittedBounds => {
  const frame = target.closest<HTMLElement>(".wd-window-frame-ui");
  if (frame === null) {
    return { blockSize: 0, inlineSize: 0, insetBlockStart: 0, insetInlineStart: 0 };
  }

  return {
    blockSize: frame.offsetHeight,
    inlineSize: frame.offsetWidth,
    insetBlockStart: frame.offsetTop,
    insetInlineStart: frame.offsetLeft,
  };
};

const isPrimaryPointer = (event: PointerEvent<HTMLElement>) =>
  event.isPrimary !== false && (event.pointerType !== "mouse" || event.button === 0);

const calculateGestureBounds = (
  gesture: WindowFrameUIGesture,
  clientX: number,
  clientY: number,
  minimumBlockSize: number,
  minimumInlineSize: number,
): WindowFrameUICommittedBounds => {
  const deltaInline = clientX - gesture.startClientX;
  const deltaBlock = clientY - gesture.startClientY;

  if (gesture.kind === "move") {
    return {
      ...gesture.startBounds,
      insetBlockStart: gesture.startBounds.insetBlockStart + deltaBlock,
      insetInlineStart: gesture.startBounds.insetInlineStart + deltaInline,
    };
  }

  const direction = gesture.direction ?? "se";
  const changesNorth = direction.includes("n");
  const changesSouth = direction.includes("s");
  const changesEast = direction.includes("e");
  const changesWest = direction.includes("w");
  const blockSize = Math.max(
    minimumBlockSize,
    gesture.startBounds.blockSize +
      (changesSouth ? deltaBlock : 0) -
      (changesNorth ? deltaBlock : 0),
  );
  const inlineSize = Math.max(
    minimumInlineSize,
    gesture.startBounds.inlineSize +
      (changesEast ? deltaInline : 0) -
      (changesWest ? deltaInline : 0),
  );

  return {
    blockSize,
    inlineSize,
    insetBlockStart: changesNorth
      ? gesture.startBounds.insetBlockStart + (gesture.startBounds.blockSize - blockSize)
      : gesture.startBounds.insetBlockStart,
    insetInlineStart: changesWest
      ? gesture.startBounds.insetInlineStart + (gesture.startBounds.inlineSize - inlineSize)
      : gesture.startBounds.insetInlineStart,
  };
};

/**
 * 계산이 끝난 창 geometry와 visual state를 표현하고 pointer move/resize를 transient하게 수행한다.
 *
 * 완료된 bounds의 저장, stacking, visibility와 animation 뒤 semantic 상태 변경은 소비자가 소유한다.
 */
export const WindowFrameUI = ({
  activity = "active",
  bounds,
  children,
  className,
  draggable = false,
  dragging = false,
  fullscreen = false,
  minimumBlockSize = 200,
  minimumInlineSize = 320,
  motion = "idle",
  onMoveCommit,
  onResizeCommit,
  onResizeStart,
  resizable = false,
  resizeDisabled = false,
  routeBar,
  style,
  titleBar,
  variant = "folder",
  ...props
}: WindowFrameUIProps) => {
  const gestureRef = useRef<WindowFrameUIGesture | null>(null);
  const transientBoundsRef = useRef<WindowFrameUICommittedBounds | undefined>(undefined);
  const [gestureKind, setGestureKind] = useState<"move" | "none" | "resize">("none");
  const [transientBounds, setTransientBounds] = useState<WindowFrameUICommittedBounds | undefined>(
    undefined,
  );

  useEffect(() => {
    if (gestureRef.current === null) {
      transientBoundsRef.current = undefined;
      setTransientBounds(undefined);
    }
  }, [bounds?.blockSize, bounds?.inlineSize, bounds?.insetBlockStart, bounds?.insetInlineStart]);

  const startGesture = useCallback(
    (
      event: PointerEvent<HTMLElement>,
      kind: WindowFrameUIGesture["kind"],
      direction?: WindowResizeUIDirection,
    ) => {
      if (!isPrimaryPointer(event)) return;
      if (kind === "move" && (!draggable || fullscreen)) return;
      if (kind === "resize" && (!resizable || resizeDisabled || fullscreen)) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const startBounds = readRenderedBounds(event.currentTarget);
      gestureRef.current = {
        direction,
        kind,
        pointerId: event.pointerId,
        startBounds,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      transientBoundsRef.current = startBounds;
      setTransientBounds(startBounds);
      setGestureKind(kind);
    },
    [draggable, fullscreen, resizable, resizeDisabled],
  );

  const updateGesture = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (gesture === null || gesture.pointerId !== event.pointerId) return undefined;
      const nextBounds = calculateGestureBounds(
        gesture,
        event.clientX,
        event.clientY,
        minimumBlockSize,
        minimumInlineSize,
      );
      transientBoundsRef.current = nextBounds;
      setTransientBounds(nextBounds);
      return nextBounds;
    },
    [minimumBlockSize, minimumInlineSize],
  );

  const endGesture = useCallback(
    (event: PointerEvent<HTMLElement>, commit: boolean) => {
      const gesture = gestureRef.current;
      if (gesture === null || gesture.pointerId !== event.pointerId) return;

      const finalBounds = commit
        ? (updateGesture(event) ?? transientBoundsRef.current ?? gesture.startBounds)
        : gesture.startBounds;
      gestureRef.current = null;
      setGestureKind("none");

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }

      if (!commit) {
        transientBoundsRef.current = undefined;
        setTransientBounds(undefined);
        return;
      }

      if (gesture.kind === "move") onMoveCommit?.({ bounds: finalBounds });
      else if (gesture.direction !== undefined) {
        onResizeCommit?.({ bounds: finalBounds, direction: gesture.direction });
      }
    },
    [onMoveCommit, onResizeCommit, updateGesture],
  );

  const interaction = useMemo(
    () => ({
      onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
        if (gestureRef.current !== null) endGesture(event, false);
      },
      onMovePointerDown: (event: PointerEvent<HTMLElement>) => startGesture(event, "move"),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => endGesture(event, false),
      onPointerMove: updateGesture,
      onPointerUp: (event: PointerEvent<HTMLElement>) => endGesture(event, true),
      onResizePointerDown: (event: PointerEvent<HTMLElement>, direction: WindowResizeUIDirection) =>
        startGesture(event, "resize", direction),
    }),
    [endGesture, startGesture, updateGesture],
  );
  const renderedBounds = transientBounds ?? bounds;

  return (
    <WindowFrameUIInteractionContext.Provider value={interaction}>
      <section
        {...props}
        className={clsx("wd-window-frame-ui", className)}
        data-activity={activity}
        data-dragging={dragging || gestureKind !== "none" ? "true" : "false"}
        data-fullscreen={fullscreen ? "true" : "false"}
        data-gesture={gestureKind}
        data-motion={motion}
        data-resizable={resizable ? "true" : "false"}
        data-variant={variant}
        style={
          {
            "--wd-window-frame-block-size": toPixelValue(renderedBounds?.blockSize),
            "--wd-window-frame-inline-size": toPixelValue(renderedBounds?.inlineSize),
            "--wd-window-frame-inset-block-start": toPixelValue(renderedBounds?.insetBlockStart),
            "--wd-window-frame-inset-inline-start": toPixelValue(renderedBounds?.insetInlineStart),
            ...style,
          } as CSSProperties
        }
      >
        {titleBar}
        {routeBar}
        <div className="wd-window-frame-ui__body">{children}</div>
        {resizable ? (
          <WindowResizeHandlesUI disabled={resizeDisabled} onResizeStart={onResizeStart} />
        ) : null}
      </section>
    </WindowFrameUIInteractionContext.Provider>
  );
};
