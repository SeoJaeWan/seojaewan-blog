import { describe, expect, it, vi } from "vitest";

import type {
  OperationId,
  WindowPresentationRequest,
  WindowSessionId,
} from "../../../../../../headless/index.js";
import { createWindowPresentationBinding } from "./index.js";

/** 테스트에서 구분되는 Window presentation 요청을 만든다. */
const createRequest = (
  operationId: string,
  sessionId: string,
  phase: WindowPresentationRequest["phase"] = "window-enter",
): WindowPresentationRequest =>
  Object.freeze({
    operationId: operationId as OperationId,
    phase,
    sessionId: sessionId as WindowSessionId,
  });

describe("createWindowPresentationBinding", () => {
  it("mount 전에 받은 요청을 같은 Session consumer가 연결될 때 전달한다", () => {
    const binding = createWindowPresentationBinding();
    const request = createRequest("operation-before-mount", "session-a");
    const consume = vi.fn();

    void binding.present(request);
    binding.mount(request.sessionId, consume);

    expect(consume).toHaveBeenCalledExactlyOnceWith(request);
  });

  it("연결된 Session에 요청을 즉시 전달하고 다른 Session과 분리한다", () => {
    const binding = createWindowPresentationBinding();
    const first = createRequest("operation-first", "session-a");
    const second = createRequest("operation-second", "session-b");
    const firstConsumer = vi.fn();
    const secondConsumer = vi.fn();
    binding.mount(first.sessionId, firstConsumer);
    binding.mount(second.sessionId, secondConsumer);
    firstConsumer.mockClear();
    secondConsumer.mockClear();

    void binding.present(first);

    expect(firstConsumer).toHaveBeenCalledExactlyOnceWith(first);
    expect(secondConsumer).not.toHaveBeenCalled();
  });

  it("현재 요청과 정확히 일치하는 release만 보관값과 consumer 입력을 지운다", () => {
    const binding = createWindowPresentationBinding();
    const previous = createRequest("operation-previous", "session-a");
    const current = createRequest("operation-current", "session-a", "window-maximize");
    const consume = vi.fn();
    binding.mount(current.sessionId, consume);
    void binding.present(previous);
    void binding.present(current);
    consume.mockClear();

    binding.release(previous);
    expect(consume).not.toHaveBeenCalled();

    binding.release(current);
    expect(consume).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("연결 해제 뒤에는 전달을 멈추고 재연결 시 보관 중인 요청을 전달한다", () => {
    const binding = createWindowPresentationBinding();
    const request = createRequest("operation-reconnect", "session-a");
    const firstConsumer = vi.fn();
    const secondConsumer = vi.fn();
    const unmount = binding.mount(request.sessionId, firstConsumer);
    firstConsumer.mockClear();

    unmount();
    void binding.present(request);
    expect(firstConsumer).not.toHaveBeenCalled();

    binding.mount(request.sessionId, secondConsumer);
    expect(secondConsumer).toHaveBeenCalledExactlyOnceWith(request);
  });
});
