import { createRef } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarPanel } from "./index";

const getPanelContainer = (testId: string) => {
  const container = screen.getByTestId(testId).closest(".wb-taskbar-panel-container");

  if (!(container instanceof HTMLDivElement)) {
    throw new Error("TaskbarPanelContainerUI를 찾을 수 없습니다.");
  }

  return container;
};

const renderPanel = (portalContainer = document.body) =>
  render(
    <TaskbarPanel portalContainer={portalContainer}>
      <TaskbarPanel.Root panelId="start">
        <TaskbarPanel.Trigger>
          <button type="button">시작</button>
        </TaskbarPanel.Trigger>
        <TaskbarPanel.Content>
          <div data-testid="start-content">시작 panel</div>
        </TaskbarPanel.Content>
      </TaskbarPanel.Root>
    </TaskbarPanel>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TaskbarPanel", () => {
  describe("compound scope", () => {
    it("Root를 TaskbarPanel 밖에서 사용하면 사용 위치 오류를 발생시킨다", () => {
      expect(() =>
        render(
          <TaskbarPanel.Root>
            <div />
          </TaskbarPanel.Root>,
        ),
      ).toThrow("TaskbarPanel.Root는 TaskbarPanel 안에서 사용해야 합니다.");
    });

    it("Trigger를 Root 밖에서 사용하면 사용 위치 오류를 발생시킨다", () => {
      expect(() =>
        render(
          <TaskbarPanel>
            <TaskbarPanel.Trigger>
              <button type="button">시작</button>
            </TaskbarPanel.Trigger>
          </TaskbarPanel>,
        ),
      ).toThrow("TaskbarPanel.Trigger는 TaskbarPanel.Root 안에서 사용해야 합니다.");
    });

    it("Content를 Root 밖에서 사용하면 사용 위치 오류를 발생시킨다", () => {
      expect(() =>
        render(
          <TaskbarPanel>
            <TaskbarPanel.Content>panel</TaskbarPanel.Content>
          </TaskbarPanel>,
        ),
      ).toThrow("TaskbarPanel.Content는 TaskbarPanel.Root 안에서 사용해야 합니다.");
    });
  });

  describe("Trigger and Content", () => {
    it("Trigger가 Content ID와 열린 상태를 접근성 속성으로 제공한다", async () => {
      renderPanel();
      const trigger = screen.getByRole("button", { name: "시작" });
      const contentId = trigger.getAttribute("aria-controls");

      expect(contentId).not.toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.getElementById(contentId!)).toBeNull();

      fireEvent.click(trigger);

      await screen.findByTestId("start-content");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
      expect(document.getElementById(contentId!)).toBe(getPanelContainer("start-content"));
    });

    it("Content를 지정한 portal container의 공용 layer에 렌더링한다", async () => {
      const portalContainer = document.createElement("section");
      document.body.append(portalContainer);
      renderPanel(portalContainer);

      fireEvent.click(screen.getByRole("button", { name: "시작" }));

      const content = await screen.findByTestId("start-content");
      expect(portalContainer.contains(content)).toBe(true);
      expect(content.closest(".wb-taskbar-panel-layer")).not.toBeNull();
      portalContainer.remove();
    });

    it("자식 button의 click handler와 ref를 보존하면서 panel toggle을 합성한다", async () => {
      const onClick = vi.fn();
      const ref = createRef<HTMLButtonElement>();

      render(
        <TaskbarPanel>
          <TaskbarPanel.Root>
            <TaskbarPanel.Trigger>
              <button onClick={onClick} ref={ref} type="button">
                검색
              </button>
            </TaskbarPanel.Trigger>
            <TaskbarPanel.Content>검색 panel</TaskbarPanel.Content>
          </TaskbarPanel.Root>
        </TaskbarPanel>,
      );
      const trigger = screen.getByRole("button", { name: "검색" });

      fireEvent.click(trigger);

      expect(onClick).toHaveBeenCalledOnce();
      expect(ref.current).toBe(trigger);
      await screen.findByText("검색 panel");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    it("자식 button이 click 기본 동작을 막으면 panel을 열지 않는다", () => {
      render(
        <TaskbarPanel>
          <TaskbarPanel.Root>
            <TaskbarPanel.Trigger>
              <button onClick={(event) => event.preventDefault()} type="button">
                검색
              </button>
            </TaskbarPanel.Trigger>
            <TaskbarPanel.Content>검색 panel</TaskbarPanel.Content>
          </TaskbarPanel.Root>
        </TaskbarPanel>,
      );
      const trigger = screen.getByRole("button", { name: "검색" });

      fireEvent.click(trigger);

      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByText("검색 panel")).toBeNull();
    });

    it("열린 panel을 다시 누르면 closing 뒤 Content를 DOM에서 제거한다", async () => {
      renderPanel();
      const trigger = screen.getByRole("button", { name: "시작" });

      fireEvent.click(trigger);
      await screen.findByTestId("start-content");
      const container = getPanelContainer("start-content");
      fireEvent.animationEnd(container);
      await waitFor(() => expect(container.dataset.state).toBe("open"));

      fireEvent.click(trigger);

      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(container.dataset.state).toBe("closing");
      expect(screen.getByTestId("start-content")).toBeDefined();

      fireEvent.animationEnd(container);

      await waitFor(() => expect(screen.queryByTestId("start-content")).toBeNull());
    });
  });

  describe("multiple panels", () => {
    it("다른 Trigger를 누르면 기존 Content는 closing, 새 Content는 opening으로 전환한다", async () => {
      render(
        <TaskbarPanel>
          <TaskbarPanel.Root panelId="start">
            <TaskbarPanel.Trigger>
              <button type="button">시작</button>
            </TaskbarPanel.Trigger>
            <TaskbarPanel.Content>
              <div data-testid="start-content">시작 panel</div>
            </TaskbarPanel.Content>
          </TaskbarPanel.Root>
          <TaskbarPanel.Root panelId="search">
            <TaskbarPanel.Trigger>
              <button type="button">검색</button>
            </TaskbarPanel.Trigger>
            <TaskbarPanel.Content>
              <div data-testid="search-content">검색 panel</div>
            </TaskbarPanel.Content>
          </TaskbarPanel.Root>
        </TaskbarPanel>,
      );
      const startTrigger = screen.getByRole("button", { name: "시작" });
      const searchTrigger = screen.getByRole("button", { name: "검색" });
      fireEvent.click(startTrigger);
      await screen.findByTestId("start-content");
      fireEvent.animationEnd(getPanelContainer("start-content"));

      fireEvent.click(searchTrigger);

      await screen.findByTestId("search-content");
      expect(getPanelContainer("start-content").dataset.state).toBe("closing");
      expect(getPanelContainer("search-content").dataset.state).toBe("opening");
      expect(startTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(searchTrigger.getAttribute("aria-expanded")).toBe("true");
    });
  });
});
