import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";
import { FolderStatus } from "./index.js";

afterEach(() => cleanup());

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("FolderStatus", () => {
  it("검색·선택 count와 현재 pressed view를 표시한다", () => {
    const { actions } = createActions();
    render(
      <FolderStatus
        actions={actions}
        status={{ itemCount: 3, searchResultCount: 3, selectionCount: 1 }}
        viewMode="details"
      />,
    );
    expect(screen.getByText(/검색 결과 3개 · 1개 선택됨/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "자세히" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "보통 아이콘" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("quick view는 view Action만 한 번 호출한다", () => {
    const { actions, execute } = createActions();
    render(
      <FolderStatus
        actions={actions}
        status={{ itemCount: 3, searchResultCount: null, selectionCount: 0 }}
        viewMode="details"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "보통 아이콘" }));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.view.update",
      change: { viewMode: "medium-icons" },
    });
  });

  it("mobile 또는 unresolved status는 렌더링하지 않는다", () => {
    const { actions } = createActions();
    const rendered = render(<FolderStatus actions={actions} status={null} viewMode={null} />);
    expect(screen.queryByRole("contentinfo", { name: "폴더 상태" })).toBeNull();
    rendered.rerender(
      <FolderStatus
        actions={actions}
        status={{ itemCount: null, searchResultCount: null, selectionCount: null }}
        viewMode={null}
      />,
    );
    expect(screen.queryByRole("contentinfo", { name: "폴더 상태" })).toBeNull();
  });
});
