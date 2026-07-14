import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarWindowPanel } from "./index";

const RESULTS: WindowItem[] = [
  { id: "react", title: "React" },
  { id: "redux", title: "Redux" },
  { id: "media", title: "미디어" },
];

afterEach(cleanup);

describe("TaskbarWindowPanel", () => {
  it("검색어가 없으면 전체 결과를 section으로 변환한 pinned/all view를 렌더링한다", () => {
    const { container } = render(
      <TaskbarWindowPanel
        aria-label="시작"
        id="start-panel"
        results={RESULTS}
        searchInputProps={{ readOnly: true, value: "" }}
      />,
    );

    expect(screen.getByRole("dialog", { name: "시작" }).id).toBe("start-panel");

    const views = container.querySelector(".wb-windows-panel__views");
    expect(views?.getAttribute("data-view")).toBe("pinned");

    fireEvent.click(screen.getByRole("button", { name: /^모두/ }));

    expect(views?.getAttribute("data-view")).toBe("all");
    expect(container.querySelector('[data-category="R"]')?.textContent).toBe("R");
    expect(container.querySelector('[data-category="ㅁ"]')?.textContent).toBe("ㅁ");
  });

  it("검색 상세 선택 후 결과 객체가 갱신되면 같은 ID의 최신 item을 렌더링한다", () => {
    const { container, rerender } = render(
      <TaskbarWindowPanel
        aria-label="시작"
        id="start-panel"
        results={RESULTS}
        searchInputProps={{ readOnly: true, value: "re" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "최적의 일치" }).textContent).toBe(
      "최적의 일치",
    );
    fireEvent.click(screen.getByRole("button", { name: "React 자세히" }));
    expect(container.querySelector(".wb-task-search-result__detail-title")?.textContent).toBe(
      "React",
    );

    const updatedItem: WindowItem = { id: "react", title: "React 업데이트" };
    rerender(
      <TaskbarWindowPanel
        aria-label="시작"
        id="start-panel"
        results={[updatedItem, ...RESULTS.slice(1)]}
        searchInputProps={{ readOnly: true, value: "re" }}
      />,
    );

    expect(container.querySelector(".wb-task-search-result__detail-title")?.textContent).toBe(
      "React 업데이트",
    );
  });

  it("검색 결과와 pinned item의 context menu source를 구분해 전달한다", () => {
    const onItemContextMenu = vi.fn();
    const { container, rerender } = render(
      <TaskbarWindowPanel
        aria-label="시작"
        id="start-panel"
        onItemContextMenu={onItemContextMenu}
        results={RESULTS}
        searchInputProps={{ readOnly: true, value: "re" }}
      />,
    );
    const searchResult = container.querySelector(".wb-task-search-result__main");
    if (!(searchResult instanceof HTMLButtonElement)) {
      throw new Error("검색 결과 button을 찾을 수 없습니다.");
    }

    fireEvent.contextMenu(searchResult);

    expect(onItemContextMenu).toHaveBeenLastCalledWith(
      expect.anything(),
      RESULTS[0],
      "search",
    );

    rerender(
      <TaskbarWindowPanel
        aria-label="시작"
        id="start-panel"
        onItemContextMenu={onItemContextMenu}
        pinnedItems={RESULTS}
        results={RESULTS}
        searchInputProps={{ readOnly: true, value: "" }}
      />,
    );
    const pinnedItem = container.querySelector(".wb-windows-panel__pinned-item");
    if (!(pinnedItem instanceof HTMLButtonElement)) {
      throw new Error("pinned item button을 찾을 수 없습니다.");
    }

    fireEvent.contextMenu(pinnedItem);

    expect(onItemContextMenu).toHaveBeenLastCalledWith(
      expect.anything(),
      RESULTS[0],
      "pinned",
    );
  });
});
