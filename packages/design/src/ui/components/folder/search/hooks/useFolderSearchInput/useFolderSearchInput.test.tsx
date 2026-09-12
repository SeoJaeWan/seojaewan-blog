import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../../../headless/folders/index.js";
import { useFolderSearchInput } from "./index.js";

afterEach(cleanup);

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("useFolderSearchInput", () => {
  it("IME 조합 중간값은 보존하고 확정된 검색어만 한 번 전달한다", () => {
    const { actions, execute } = createActions();
    const hook = renderHook(() => useFolderSearchInput({ actions, query: "" }));

    act(() => hook.result.current.startComposition());
    act(() => hook.result.current.changeValue("ㅎ"));
    expect(hook.result.current.rawValue).toBe("ㅎ");
    expect(execute).not.toHaveBeenCalled();

    act(() => hook.result.current.endComposition("한"));
    act(() => hook.result.current.changeValue("한"));
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "file-explorer.query.set",
      query: "한",
    });
  });

  it("외부 query는 조합 중 draft를 덮지 않고 조합 종료 뒤 동기화한다", () => {
    const { actions } = createActions();
    const hook = renderHook(({ query }) => useFolderSearchInput({ actions, query }), {
      initialProps: { query: "처음" },
    });
    act(() => hook.result.current.startComposition());
    act(() => hook.result.current.changeValue("입력 중"));

    hook.rerender({ query: "외부" });
    expect(hook.result.current.rawValue).toBe("입력 중");

    act(() => hook.result.current.endComposition("완료"));
    hook.rerender({ query: "동기화" });
    expect(hook.result.current.rawValue).toBe("동기화");
  });
});
