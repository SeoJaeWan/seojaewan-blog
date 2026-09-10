import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";
import type { FolderContentFocusTarget } from "../navigation/index.js";
import { FolderContent } from "./index.js";

afterEach(() => cleanup());

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("FolderContent", () => {
  it("normal 상태에서 전달받은 renderer slot만 표시한다", () => {
    const { actions } = createActions();
    render(
      <FolderContent actions={actions} empty={null} error={null}>
        <div>후속 Resource renderer</div>
      </FolderContent>,
    );
    expect(screen.getByText("후속 Resource renderer")).toBeTruthy();
  });

  it("error와 search-empty 상태를 제품 메시지로 표시한다", () => {
    const { actions } = createActions();
    const rendered = render(
      <FolderContent
        actions={actions}
        empty={null}
        error={{ kind: "unresolved-path", path: "/Missing", message: "missing" }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("/Missing");
    rendered.rerender(<FolderContent actions={actions} empty="search" error={null} />);
    expect(screen.getByRole("status").textContent).toContain("검색 결과가 없습니다");
  });

  it("빈 Content focus를 selection clear Action과 등록된 focus target에 연결한다", () => {
    const { actions, execute } = createActions();
    const registerFocusTarget = vi.fn<(target: FolderContentFocusTarget | null) => void>();
    render(
      <FolderContent
        actions={actions}
        empty="folder"
        error={null}
        registerFocusTarget={registerFocusTarget}
      />,
    );
    registerFocusTarget.mock.calls[0]?.[0]?.focus();
    expect(execute).toHaveBeenCalledWith({ type: "file-explorer.selection.set", selection: [] });
  });
});
