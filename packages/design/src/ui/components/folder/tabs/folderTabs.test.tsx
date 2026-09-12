import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FileExplorerControllerActions,
  FileExplorerTabView,
} from "../../../../headless/folders/index.js";
import { FolderTabs } from "./index.js";

const firstId = "00000000-0000-4000-8000-000000000001" as FileExplorerTabView["id"];
const secondId = "00000000-0000-4000-8000-000000000002" as FileExplorerTabView["id"];
const tabs: readonly FileExplorerTabView[] = [
  {
    id: firstId,
    title: "Desktop",
    address: "/",
    target: { kind: "location", location: null },
    active: true,
  },
  {
    id: secondId,
    title: "Blog",
    address: "/Blog",
    target: { kind: "location", location: null },
    active: false,
  },
];

const createActions = () => {
  const execute = vi.fn<FileExplorerControllerActions["execute"]>(() => ({
    status: "unavailable",
    reason: "not-ready",
  }));
  return { actions: { execute } satisfies FileExplorerControllerActions, execute };
};

describe("FolderTabs", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("tab 선택·닫기·추가를 정확한 controller Action으로 전달한다", () => {
    const { actions, execute } = createActions();
    render(<FolderTabs actions={actions} activeTabId={firstId} tabs={tabs} />);

    fireEvent.click(screen.getByRole("tab", { name: "Blog" }));
    fireEvent.click(screen.getByRole("button", { name: "Blog 탭 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "새 탭" }));

    expect(execute.mock.calls.map(([action]) => action)).toEqual([
      { type: "file-explorer.tab.activate", tabId: secondId },
      { type: "file-explorer.tab.close", tabId: secondId },
      { type: "file-explorer.tab.add" },
    ]);
  });

  it("좌우 focus 이동을 활성 tab Action으로 연결하고 끝에서 순환한다", () => {
    const { actions, execute } = createActions();
    render(<FolderTabs actions={actions} activeTabId={firstId} tabs={tabs} />);
    const first = screen.getByRole("tab", { name: "Desktop" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowLeft" });

    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.tab.activate",
      tabId: secondId,
    });
  });

  it("tab viewport가 넘치면 좌우 이동 control을 노출한다", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    const { actions } = createActions();

    render(<FolderTabs actions={actions} activeTabId={firstId} tabs={tabs} />);

    expect(screen.getByRole("button", { name: "이전 탭 보기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "다음 탭 보기" })).toBeTruthy();
  });

  it("mobile read model에서는 tab strip을 렌더링하지 않는다", () => {
    const { actions } = createActions();
    render(<FolderTabs actions={actions} activeTabId={firstId} tabs={null} />);
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
