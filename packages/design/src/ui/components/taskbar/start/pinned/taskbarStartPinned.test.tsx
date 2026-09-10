import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createResourceRef,
  type StartControllerActions,
  type StartOperationHandle,
} from "../../../../../headless/index.js";
import { type StartPinnedItemViewModel,TaskbarStartPinned } from "./index.js";

const items = [
  {
    resource: createResourceRef("folder", "10000000-0000-4000-8000-000000000001"),
    label: "첫 폴더",
    reorderActions: ["right"],
  },
  {
    resource: createResourceRef("content", "10000000-0000-4000-8000-000000000002"),
    label: "아주 긴 Content 제목이 두 줄을 넘어가도 tile의 높이와 현재 title을 유지합니다",
    reorderActions: ["first", "left", "right"],
  },
  {
    resource: createResourceRef(
      "external-shortcut",
      "10000000-0000-4000-8000-000000000003",
    ),
    label: "마지막 Shortcut",
    reorderActions: ["first", "left"],
  },
] as const satisfies readonly StartPinnedItemViewModel[];

const idleHandle = {
  operationId: "test-operation",
  committed: new Promise(() => undefined),
  presented: new Promise(() => undefined),
  settled: new Promise(() => undefined),
} as unknown as StartOperationHandle;

const createActions = (): StartControllerActions => ({
  abortTransition: vi.fn(() => true),
  completeTransition: vi.fn(() => true),
  execute: vi.fn(() => idleHandle),
  failTransition: vi.fn(() => true),
});

afterEach(() => cleanup());

describe("TaskbarStartPinned", () => {
  it("Folder, Content와 ExternalShortcut data, label과 위치 capability를 렌더링한다", () => {
    const actions = createActions();
    const onItemContextMenu = vi.fn();
    const onItemOpen = vi.fn();
    const onShowAll = vi.fn();
    render(
      <TaskbarStartPinned
        actions={actions}
        items={items}
        onItemContextMenu={onItemContextMenu}
        onItemOpen={onItemOpen}
        onShowAll={onShowAll}
      />,
    );

    const grid = screen.getByRole("grid", { name: "고정된 항목" });
    expect(grid.getAttribute("aria-colcount")).toBe("6");
    expect(grid.getAttribute("aria-rowcount")).toBe("1");
    const first = screen.getByRole("gridcell", { name: "첫 폴더" });
    const middle = screen.getByRole("gridcell", { name: items[1].label });
    const last = screen.getByRole("gridcell", { name: "마지막 Shortcut" });
    expect(first.getAttribute("data-resource-kind")).toBe("folder");
    expect(first.getAttribute("data-can-move-right")).toBe("true");
    expect(first.hasAttribute("data-can-move-left")).toBe(false);
    expect(middle.getAttribute("title")).toBe(items[1].label);
    expect(middle.getAttribute("data-resource-kind")).toBe("content");
    expect(middle.getAttribute("data-can-move-first")).toBe("true");
    expect(middle.getAttribute("data-can-move-left")).toBe("true");
    expect(middle.getAttribute("data-can-move-right")).toBe("true");
    expect(last.getAttribute("data-resource-kind")).toBe("external-shortcut");
    expect(last.getAttribute("data-can-move-first")).toBe("true");
    expect(last.getAttribute("data-can-move-left")).toBe("true");
    expect(last.hasAttribute("data-can-move-right")).toBe(false);

    fireEvent.click(middle);
    expect(onItemOpen).toHaveBeenCalledTimes(1);
    expect(onItemOpen).toHaveBeenCalledWith(items[1]);
    fireEvent.contextMenu(last);
    expect(onItemContextMenu).toHaveBeenCalledTimes(1);
    expect(onItemContextMenu).toHaveBeenCalledWith(expect.anything(), items[2]);
    fireEvent.click(screen.getByRole("button", { name: "모두" }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it("Arrow와 Home/End로 6열 grid focus를 이동한다", () => {
    const manyItems = Array.from({ length: 8 }, (_, index) => ({
      resource: createResourceRef(
        index === 0 ? "folder" : "content",
        `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ),
      label: `항목 ${index + 1}`,
      reorderActions: [],
    })) satisfies StartPinnedItemViewModel[];
    render(<TaskbarStartPinned actions={createActions()} items={manyItems} />);

    const first = screen.getByRole("gridcell", { name: "항목 1" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("gridcell", { name: "항목 7" }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("gridcell", { name: "항목 8" }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("gridcell", { name: "항목 7" }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { ctrlKey: true, key: "Home" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { ctrlKey: true, key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("gridcell", { name: "항목 8" }));
  });

  it("inactive view를 inert로 표시하고 빈 상태를 설명한다", () => {
    const { container } = render(<TaskbarStartPinned actions={createActions()} active={false} items={[]} />);
    const section = container.querySelector("section");
    expect(section?.hasAttribute("inert")).toBe(true);
    expect(screen.getByText("고정된 항목이 없습니다.")).not.toBeNull();
  });
});
