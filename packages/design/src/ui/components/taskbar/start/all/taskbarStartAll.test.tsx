import { type ComponentProps, useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createResourceRef,
  type StartScreenAction,
  type StartScreenAllGroup,
  type StartScreenAllItem,
} from "../../../../../headless/index.js";
import { TaskbarStartAll } from "./index.js";

const groups = Object.freeze([
  Object.freeze({
    key: "A",
    items: Object.freeze([
      Object.freeze({
        label: "Alpha",
        resource: createResourceRef("content", "10000000-0000-4000-8000-000000000001"),
      }),
    ]),
  }),
  Object.freeze({
    key: "7",
    items: Object.freeze([
      Object.freeze({
        label: "7zip",
        resource: createResourceRef("external-shortcut", "10000000-0000-4000-8000-000000000002"),
      }),
    ]),
  }),
]) satisfies readonly StartScreenAllGroup[];

/** controlled headless Action 결과를 흉내 내면서 실제 DOM lifecycle을 유지하는 fixture다. */
const AllFixture = ({
  active = true,
  onItemSelect = () => undefined,
  onScreenAction = () => undefined,
  resolveResourceIcon,
}: {
  active?: boolean;
  onItemSelect?: (item: StartScreenAllItem) => void;
  onScreenAction?: (action: StartScreenAction) => void;
  resolveResourceIcon?: ComponentProps<typeof TaskbarStartAll>["resolveResourceIcon"];
}) => {
  const [indexOpen, setIndexOpen] = useState(false);
  return (
    <TaskbarStartAll
      active={active}
      groups={groups}
      indexOpen={indexOpen}
      onItemSelect={onItemSelect}
      resolveResourceIcon={resolveResourceIcon}
      onScreenAction={(action) => {
        onScreenAction(action);
        if (action.type === "set-index-open") setIndexOpen(action.open);
      }}
    />
  );
};

afterEach(() => cleanup());

describe("TaskbarStartAll", () => {
  it("Content와 ExternalShortcut row만 enabled button으로 표시하고 item intent를 전달한다", () => {
    const selected = vi.fn();
    render(<AllFixture onItemSelect={selected} />);

    const content = screen.getByRole("button", { name: "Alpha" });
    const shortcut = screen.getByRole("button", { name: "7zip" });
    expect(content.dataset.resourceKind).toBe("content");
    expect(shortcut.dataset.resourceKind).toBe("external-shortcut");
    expect(content.hasAttribute("disabled")).toBe(false);
    expect(shortcut.hasAttribute("disabled")).toBe(false);
    expect(document.querySelector('[data-resource-kind="folder"]')).toBeNull();

    fireEvent.click(shortcut);
    expect(selected).toHaveBeenCalledWith(groups[1]?.items[0]);
  });

  it("같은 ResourceRef resolver로 Content와 ExternalShortcut icon을 주입한다", () => {
    render(
      <AllFixture
        resolveResourceIcon={(resource) => <span data-testid={`icon-${resource.kind}`} />}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Alpha" }).querySelector('[data-testid="icon-content"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "7zip" })
        .querySelector('[data-testid="icon-external-shortcut"]'),
    ).not.toBeNull();
  });

  it("비활성 view와 열린 overlay에서 각각 올바른 surface를 inert 처리한다", () => {
    const { container, rerender } = render(<AllFixture active={false} />);
    expect(container.querySelector(".taskbar-start-all")?.hasAttribute("inert")).toBe(true);

    rerender(<AllFixture />);
    fireEvent.click(screen.getByRole("button", { name: "A 범주 인덱스 열기" }));
    expect(container.querySelector(".taskbar-start-all__index")?.hasAttribute("inert")).toBe(false);
    expect(container.querySelector(".taskbar-start-all__list")?.hasAttribute("inert")).toBe(true);
    expect(container.querySelectorAll("[data-start-index-category]")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "F 범주로 이동" })).toBeNull();
  });

  it("category 선택은 실제 heading 위치로 scroll하고 overlay를 닫은 뒤 heading에 focus한다", async () => {
    const actions = vi.fn();
    const { container } = render(<AllFixture onScreenAction={actions} />);
    const list = container.querySelector<HTMLDivElement>(".taskbar-start-all__list");
    const heading = screen.getByRole<HTMLButtonElement>("button", {
      name: "7 범주 인덱스 열기",
    });
    if (list === null) throw new Error("All list가 렌더링되어야 합니다");
    Object.defineProperty(list, "offsetTop", { configurable: true, value: 12 });
    Object.defineProperty(heading, "offsetTop", { configurable: true, value: 212 });
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;

    fireEvent.click(screen.getByRole("button", { name: "A 범주 인덱스 열기" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "A 범주로 이동" })),
    );
    fireEvent.click(screen.getByRole("button", { name: "7 범주로 이동" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 200 });
    expect(actions).toHaveBeenLastCalledWith({ type: "set-index-open", open: false });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("Escape는 overlay opener로 focus를 복원하고 back을 semantic Action으로 전달한다", async () => {
    const actions = vi.fn();
    render(<AllFixture onScreenAction={actions} />);
    const opener = screen.getByRole<HTMLButtonElement>("button", {
      name: "A 범주 인덱스 열기",
    });

    fireEvent.click(opener);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "A 범주로 이동" })),
    );
    fireEvent.keyDown(screen.getByRole("dialog", { name: "범주 인덱스" }), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(actions).toHaveBeenLastCalledWith({ type: "set-index-open", open: false });

    fireEvent.click(screen.getByRole("button", { name: /뒤로/u }));
    expect(actions).toHaveBeenLastCalledWith({ type: "set-view", view: "pinned" });
  });
});
