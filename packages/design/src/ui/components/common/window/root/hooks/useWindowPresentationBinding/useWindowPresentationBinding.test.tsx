import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OperationId } from "../../../../../../../headless/runtime/index.js";
import type { WindowPresentationRequest, WindowSessionId } from "../../../../../../../headless/windows/index.js";
import type { WindowPresentationBinding, WindowPresentationConsumer } from "../../../utils/presentationBinding/index.js";
import { useWindowPresentationBinding } from "./index.js";

afterEach(cleanup);

describe("useWindowPresentationBinding", () => {
  it("현재 Session 요청을 구독하고 binding 해제 시 presentation을 비운다", () => {
    const cleanupBinding = vi.fn();
    let consume: WindowPresentationConsumer = () => undefined;
    const mount = vi.fn((_sessionId: WindowSessionId, consumer: WindowPresentationConsumer) => {
      consume = consumer;
      return cleanupBinding;
    });
    const binding = { mount } as unknown as WindowPresentationBinding;
    const sessionId = "10000000-0000-4000-8000-000000000001" as WindowSessionId;
    const request: WindowPresentationRequest = {
      operationId: "window-operation" as OperationId,
      sessionId,
      phase: "window-enter",
    };
    const hook = renderHook<
      WindowPresentationRequest | null,
      { value: WindowPresentationBinding | undefined }
    >(
      ({ value }) => useWindowPresentationBinding(value, sessionId),
      { initialProps: { value: binding } },
    );

    act(() => consume(request));
    expect(hook.result.current).toEqual(request);
    hook.rerender({ value: undefined });
    expect(cleanupBinding).toHaveBeenCalledOnce();
    expect(hook.result.current).toBeNull();
  });

  it("Session identity가 바뀌면 이전 구독을 정리하고 새 Session을 mount한다", () => {
    const cleanups = [vi.fn(), vi.fn()];
    const mount = vi.fn((_sessionId: WindowSessionId) => cleanups[mount.mock.calls.length - 1]);
    const binding = { mount } as unknown as WindowPresentationBinding;
    const first = "10000000-0000-4000-8000-000000000001" as WindowSessionId;
    const second = "10000000-0000-4000-8000-000000000002" as WindowSessionId;
    const hook = renderHook(({ sessionId }) => useWindowPresentationBinding(binding, sessionId), {
      initialProps: { sessionId: first },
    });

    hook.rerender({ sessionId: second });

    expect(cleanups[0]).toHaveBeenCalledOnce();
    expect(mount.mock.calls.map(([sessionId]) => sessionId)).toEqual([first, second]);
  });
});
