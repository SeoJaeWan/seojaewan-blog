import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  OperationId,
  WindowControllerActions,
  WindowPresentationRequest,
  WindowSessionId,
} from "../../../../../../headless/index.js";
import {
  useWindowPresentation,
  type WindowMotionDestination,
} from "./index.js";

/** Presentation Hook이 요구하는 동작만 관찰 가능한 mock으로 제공한다. */
const createActions = () =>
  ({
    execute: vi.fn(),
    beginGesture: vi.fn(),
    completeTransition: vi.fn(),
    abortTransition: vi.fn(),
    failTransition: vi.fn(),
  }) as unknown as WindowControllerActions;

type PresentationHarnessProps = Readonly<{
  actions: WindowControllerActions;
  active?: boolean;
  destination?: WindowMotionDestination | null;
  minimized?: boolean;
  presentation?: WindowPresentationRequest | null;
}>;

/** Hook의 frame ref와 focus capture를 실제 DOM element에 연결한다. */
const PresentationHarness = ({
  actions,
  active = true,
  destination = null,
  minimized = false,
  presentation = null,
}: PresentationHarnessProps) => {
  const lifecycle = useWindowPresentation(undefined, {
    actions,
    active,
    destination,
    minimized,
    presentation,
  });

  return (
    <div
      aria-label="테스트 창"
      onFocusCapture={lifecycle.rememberFocus}
      ref={lifecycle.frameRef}
      role="region"
      tabIndex={-1}
    >
      <input aria-label="주소" />
    </div>
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useWindowPresentation", () => {
  it("시작 시 좌표를 한 번 사용하고 이후 destination 갱신으로 animation을 교체하지 않는다", async () => {
    let animationFrame: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrame = callback;
      return 3;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const actions = createActions();
    const request: WindowPresentationRequest = {
      operationId: "operation:window:201" as OperationId,
      sessionId: "window-session:000000000201" as WindowSessionId,
      phase: "window-minimize",
    };
    let resolveFinished: (() => void) | undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const animate = vi.fn(
      (
        _keyframes: Keyframe[] | PropertyIndexedKeyframes,
        _options?: KeyframeAnimationOptions,
      ) => ({ cancel: vi.fn(), finished }) as unknown as Animation,
    );
    const firstDestination = { left: 800, top: 740, width: 32, height: 32 };
    const measuredDestination = { left: 620, top: 740, width: 32, height: 32 };
    const laterDestination = { left: 500, top: 740, width: 32, height: 32 };

    const view = render(
      <PresentationHarness actions={actions} destination={firstDestination} />,
    );
    const frame = screen.getByRole("region", { name: "테스트 창" });
    Object.defineProperty(frame, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(120, 28, 720, 520),
    });
    Object.defineProperty(frame, "animate", { configurable: true, value: animate });

    view.rerender(
      <PresentationHarness
        actions={actions}
        destination={measuredDestination}
        presentation={request}
      />,
    );
    act(() => {
      const callback = animationFrame;
      animationFrame = null;
      callback?.(0);
    });
    view.rerender(
      <PresentationHarness
        actions={actions}
        destination={laterDestination}
        presentation={request}
      />,
    );

    expect(animate).toHaveBeenCalledTimes(1);
    const keyframes = animate.mock.calls[0]?.[0];
    if (!Array.isArray(keyframes)) throw new Error("배열 keyframe을 찾지 못했습니다.");
    expect(String(keyframes[1]?.transform)).toContain("500px");

    await act(async () => {
      resolveFinished?.();
      await finished;
    });
    expect(actions.completeTransition).toHaveBeenCalledExactlyOnceWith(
      request.operationId,
      request.phase,
    );
    expect(actions.abortTransition).not.toHaveBeenCalled();
  });

  it("기억한 입력 요소가 사용할 수 없으면 복원 시 창 자체에 focus를 둔다", () => {
    const actions = createActions();
    const view = render(<PresentationHarness actions={actions} />);
    const frame = screen.getByRole("region", { name: "테스트 창" });
    const input = screen.getByRole("textbox", { name: "주소" });
    fireEvent.focus(input);

    view.rerender(<PresentationHarness actions={actions} active={false} minimized />);
    input.setAttribute("disabled", "");
    view.rerender(<PresentationHarness actions={actions} active minimized={false} />);

    expect(document.activeElement).toBe(frame);
  });
});
