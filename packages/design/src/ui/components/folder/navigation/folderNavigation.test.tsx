import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";
import type { WorkspaceBreadcrumbItem } from "../../../../headless/workspace/index.js";
import { FolderNavigation } from "./index.js";

afterEach(() => cleanup());

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

const breadcrumb: readonly WorkspaceBreadcrumbItem[] = [
  { location: null, name: "Desktop", path: "/" },
  { location: null, name: "Blog", path: "/Blog" },
  { location: null, name: "React", path: "/Blog/React" },
  { location: null, name: "Tests", path: "/Blog/React/Tests" },
];

describe("FolderNavigation", () => {
  it("breadcrumb 빈 영역을 누르면 전체 주소가 선택되고 Esc로 제출 전 편집을 취소한다", () => {
    const { actions } = createActions();
    render(
      <FolderNavigation
        actions={actions}
        address="/Blog/React/Tests"
        breadcrumb={breadcrumb}
        canGoBack
        canGoForward={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole("group", { name: "주소" }));
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "주소" });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    fireEvent.change(input, { target: { value: "/Draft" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("textbox", { name: "주소" })).toBeNull();
    expect(screen.getByText("Tests")).toBeTruthy();
  });

  it("주소 제출과 history controls를 각각 한 번씩 정확한 Action으로 전달한다", async () => {
    const { actions, execute } = createActions();
    const focus = vi.fn();
    render(
      <FolderNavigation
        actions={actions}
        address="/Blog"
        breadcrumb={breadcrumb.slice(0, 2)}
        canGoBack
        canGoForward
        contentFocusTarget={{ focus }}
        error={null}
      />,
    );
    fireEvent.click(screen.getByRole("group", { name: "주소" }));
    const input = screen.getByRole("textbox", { name: "주소" });
    execute.mockClear();
    fireEvent.change(input, { target: { value: "/Blog/React" } });
    fireEvent.submit(screen.getByRole("form", { name: "주소 입력" }));
    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "뒤로" }));
    fireEvent.click(screen.getByRole("button", { name: "앞으로" }));
    fireEvent.click(screen.getByRole("button", { name: "새로 고침" }));

    expect(execute.mock.calls.map(([action]) => action)).toEqual([
      { type: "file-explorer.navigation.submit-address", path: "/Blog/React" },
      { type: "file-explorer.navigation.back" },
      { type: "file-explorer.navigation.forward" },
      { type: "file-explorer.navigation.refresh" },
    ]);
  });

  it("unresolved 주소를 breadcrumb로 표시하고 빈 영역에서 다시 편집한다", () => {
    const { actions } = createActions();
    render(
      <FolderNavigation
        actions={actions}
        address="/Missing"
        breadcrumb={[]}
        canGoBack
        canGoForward={false}
        error={{ kind: "unresolved-path", path: "/Missing", message: "missing" }}
      />,
    );
    expect(screen.queryByRole("textbox", { name: "주소" })).toBeNull();
    expect(screen.getByText("Missing")).toBeTruthy();

    fireEvent.click(screen.getByRole("group", { name: "주소" }));
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "주소" });
    expect(input.value).toBe("/Missing");
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "주소" })).toBeNull();
    expect(screen.getByText("Missing")).toBeTruthy();
  });

  it("긴 breadcrumb의 중간 ancestors를 menu trigger로 노출한다", () => {
    const { actions } = createActions();
    render(
      <FolderNavigation
        actions={actions}
        address="/Blog/React/Tests"
        breadcrumb={breadcrumb}
        canGoBack={false}
        canGoForward={false}
        error={null}
      />,
    );

    expect(screen.getByRole("button", { name: "생략된 상위 폴더" })).toBeTruthy();
  });
});
