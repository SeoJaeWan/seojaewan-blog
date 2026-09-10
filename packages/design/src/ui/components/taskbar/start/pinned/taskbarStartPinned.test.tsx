import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createResourceRef,
  type StartControllerActions,
  type StartOperationHandle,
} from "../../../../../headless/index.js";
import { type StartPinnedItemViewModel, TaskbarStartPinned } from "./index.js";

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
    resource: createResourceRef("external-shortcut", "10000000-0000-4000-8000-000000000003"),
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
    render(<TaskbarStartPinned actions={createActions()} items={items} />);

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
  });

  it("item open, Context Menu와 모두 보기 intent를 각 callback으로 전달한다", () => {
    const onItemContextMenu = vi.fn();
    const onItemOpen = vi.fn();
    const onShowAll = vi.fn();
    render(
      <TaskbarStartPinned
        actions={createActions()}
        items={items}
        onItemContextMenu={onItemContextMenu}
        onItemOpen={onItemOpen}
        onShowAll={onShowAll}
      />,
    );

    fireEvent.click(screen.getByRole("gridcell", { name: items[1].label }));
    expect(onItemOpen).toHaveBeenCalledTimes(1);
    expect(onItemOpen).toHaveBeenCalledWith(items[1]);
    fireEvent.contextMenu(screen.getByRole("gridcell", { name: "마지막 Shortcut" }));
    expect(onItemContextMenu).toHaveBeenCalledTimes(1);
    expect(onItemContextMenu).toHaveBeenCalledWith(expect.anything(), items[2]);
    fireEvent.click(screen.getByRole("button", { name: "모두" }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it("ResourceRef resolver를 공유 Start icon Component에 전달한다", () => {
    const resolveResourceIcon = vi.fn((resource: (typeof items)[number]["resource"]) =>
      resource.kind === "external-shortcut" ? (
        <span data-testid={`custom-${resource.id}`} />
      ) : undefined,
    );
    render(
      <TaskbarStartPinned
        actions={createActions()}
        items={items}
        resolveResourceIcon={resolveResourceIcon}
      />,
    );

    expect(resolveResourceIcon).toHaveBeenCalledWith(items[2].resource);
    expect(
      screen
        .getByRole("gridcell", { name: "마지막 Shortcut" })
        .querySelector(`[data-testid="custom-${items[2].resource.id}"]`),
    ).not.toBeNull();
  });

  it("grid keydown을 6열 keyboard navigation에 연결한다", () => {
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
  });

  it("inactive view를 inert로 표시한다", () => {
    const { container } = render(
      <TaskbarStartPinned actions={createActions()} active={false} items={[]} />,
    );
    const section = container.querySelector("section");
    expect(section?.hasAttribute("inert")).toBe(true);
  });

  it("Pin이 없으면 빈 상태를 설명한다", () => {
    render(<TaskbarStartPinned actions={createActions()} items={[]} />);
    expect(screen.getByText("고정된 항목이 없습니다.")).not.toBeNull();
  });
});
