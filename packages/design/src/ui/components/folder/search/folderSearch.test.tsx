import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";
import { FolderSearch } from "./index.js";

afterEach(() => cleanup());

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("FolderSearch", () => {
  it("IME 조합 중 raw input을 유지하고 확정 query만 한 번 전달한다", () => {
    const { actions, execute } = createActions();
    render(<FolderSearch actions={actions} query="" />);
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "현재 폴더 검색" });
    execute.mockClear();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "한" } });
    expect(input.value).toBe("한");
    expect(execute).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ type: "file-explorer.query.set", query: "한" });
  });

  it("일반 입력을 즉시 query Action으로 전달하고 controlled query를 반영한다", () => {
    const { actions, execute } = createActions();
    const rendered = render(<FolderSearch actions={actions} query="초기" />);
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "현재 폴더 검색" });
    execute.mockClear();
    fireEvent.change(input, { target: { value: "next" } });
    expect(execute).toHaveBeenCalledWith({ type: "file-explorer.query.set", query: "next" });

    rendered.rerender(<FolderSearch actions={actions} query="owner" />);
    expect(input.value).toBe("owner");
  });

  it("focus를 같은 Folder의 selection clear Action으로 연결한다", () => {
    const { actions, execute } = createActions();
    render(<FolderSearch actions={actions} query="" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "현재 폴더 검색" }));
    expect(execute).toHaveBeenCalledWith({ type: "file-explorer.selection.set", selection: [] });
  });
});
