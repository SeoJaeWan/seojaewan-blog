import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WindowControllerActions, WindowSessionId } from "../../../../../../../headless/windows/index.js";
import { useWindowActivation } from "./index.js";

afterEach(cleanup);

describe("useWindowActivation", () => {
  it("비활성 Window의 연속 입력을 하나의 activate Action으로 합친다", () => {
    const execute = vi.fn();
    const actions = { execute } as unknown as WindowControllerActions;
    const sessionId = "10000000-0000-4000-8000-000000000001" as WindowSessionId;
    const hook = renderHook(() => useWindowActivation(actions, false, sessionId));

    act(() => {
      hook.result.current();
      hook.result.current();
    });

    expect(execute).toHaveBeenCalledExactlyOnceWith({ type: "activate", sessionId });
  });

  it("활성화 완료 뒤 다시 비활성이 되면 새 요청을 허용한다", () => {
    const execute = vi.fn();
    const actions = { execute } as unknown as WindowControllerActions;
    const sessionId = "10000000-0000-4000-8000-000000000001" as WindowSessionId;
    const hook = renderHook(({ active }) => useWindowActivation(actions, active, sessionId), {
      initialProps: { active: false },
    });
    act(() => hook.result.current());
    hook.rerender({ active: true });
    hook.rerender({ active: false });
    act(() => hook.result.current());

    expect(execute).toHaveBeenCalledTimes(2);
  });
});
