import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../../../headless/folders/index.js";
import { useAddressEditor } from "./index.js";

afterEach(cleanup);

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("useAddressEditor", () => {
  it("편집을 시작하면 현재 주소를 선택하고 제출 Action을 한 번 전달한다", async () => {
    const { actions, execute } = createActions();
    const input = document.createElement("input");
    const focus = vi.spyOn(input, "focus");
    const select = vi.spyOn(input, "select");
    const hook = renderHook(() =>
      useAddressEditor({ actions, address: "/Blog", error: null }),
    );
    hook.result.current.inputRef.current = input;

    act(() => hook.result.current.beginEditing());
    expect(hook.result.current.draft).toBe("/Blog");
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();

    act(() => hook.result.current.setDraft("/Blog/React"));
    act(() => hook.result.current.submitAddress());

    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "file-explorer.navigation.submit-address",
      path: "/Blog/React",
    });
    await waitFor(() => expect(hook.result.current.editing).toBe(false));
  });

  it("오류가 해소되면 breadcrumb로 돌아가고 content focus를 복원한다", () => {
    const { actions } = createActions();
    const contentFocus = vi.fn();
    type Props = {
      error: { kind: "unresolved-path"; path: string; message: string } | null;
    };
    const hook = renderHook<ReturnType<typeof useAddressEditor>, Props>(
      ({ error }) =>
        useAddressEditor({
          actions,
          address: "/Missing",
          contentFocusTarget: { focus: contentFocus },
          error,
        }),
      {
        initialProps: {
          error: { kind: "unresolved-path" as const, path: "/Missing", message: "missing" },
        },
      },
    );
    act(() => hook.result.current.beginEditing());

    hook.rerender({ error: null });

    expect(hook.result.current.editing).toBe(false);
    expect(contentFocus).toHaveBeenCalledOnce();
  });
});
