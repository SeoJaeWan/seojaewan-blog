import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Windows } from "../../windows";
import { useWindowEvent } from "../../windows/providers/windowsEventsProvider";
import type { WindowContextMenuEvent, WindowItemEvent, WindowPinEvent } from "../../windows/types";
import { TaskbarPanel } from "../panel";
import { TaskbarStartButton } from "./index";

const REACT = { id: "react", title: "React" } satisfies WindowItem;
const WINDOWS_ITEMS = [REACT] satisfies readonly WindowItem[];

interface ObserverProps {
  onContextMenu?: (event: WindowContextMenuEvent) => void;
  onOpen?: (event: WindowItemEvent) => void;
  onOpenLocation?: (event: WindowItemEvent) => void;
  onWindowsPin?: (event: WindowPinEvent) => void;
}

const Observer = ({ onContextMenu, onOpen, onOpenLocation, onWindowsPin }: ObserverProps) => {
  useWindowEvent("windowContextMenuRequested", (event) => onContextMenu?.(event));
  useWindowEvent("windowOpen", (event) => onOpen?.(event));
  useWindowEvent("windowOpenLocation", (event) => onOpenLocation?.(event));
  useWindowEvent("windowPinToStart", (event) => onWindowsPin?.(event));
  return null;
};

const createTree = (observerProps: ObserverProps = {}) => (
  <Windows windowsItems={WINDOWS_ITEMS}>
    <TaskbarPanel portalContainer={document.body}>
      <Observer {...observerProps} />
      <TaskbarStartButton />
    </TaskbarPanel>
  </Windows>
);

const openSettledPanel = async () => {
  const startButton = screen.getByRole("button", { name: "시작" });
  fireEvent.click(startButton);
  const dialog = await screen.findByRole("dialog", { name: "시작" });
  const panelContainer = dialog.closest(".wb-taskbar-panel-container");

  if (!(panelContainer instanceof HTMLDivElement)) {
    throw new Error("taskbar panel container를 찾을 수 없습니다.");
  }

  fireEvent.animationEnd(panelContainer);
  await waitFor(() => expect(panelContainer.dataset.state).toBe("open"));

  return { panelContainer, startButton };
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("TaskbarStartButton", () => {
  it("검색 item을 열면 source를 dispatch하고 시작 panel을 닫는다", async () => {
    const onOpen = vi.fn();

    render(createTree({ onOpen }));
    const { startButton } = await openSettledPanel();

    fireEvent.change(screen.getByRole("textbox", { name: "앱 및 문서 검색" }), {
      target: { value: "react" },
    });
    fireEvent.click(screen.getByRole("button", { name: "React" }));

    expect(onOpen).toHaveBeenCalledWith({ item: REACT, source: "search" });
    expect(startButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("위치 열기는 panel을 닫고 windowOpenLocation을 dispatch한다", async () => {
    const onOpenLocation = vi.fn();

    render(createTree({ onOpenLocation }));
    const { startButton } = await openSettledPanel();

    fireEvent.change(screen.getByRole("textbox", { name: "앱 및 문서 검색" }), {
      target: { value: "react" },
    });
    fireEvent.click(screen.getByRole("button", { name: "React 자세히" }));
    fireEvent.click(screen.getByRole("button", { name: "파일 위치 열기" }));

    expect(onOpenLocation).toHaveBeenCalledWith({ item: REACT, source: "search" });
    expect(startButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("pin과 context menu 동작은 observer event 뒤에도 panel을 유지한다", async () => {
    const onContextMenu = vi.fn();
    const onWindowsPin = vi.fn();

    render(createTree({ onContextMenu, onWindowsPin }));
    const { startButton } = await openSettledPanel();

    fireEvent.change(screen.getByRole("textbox", { name: "앱 및 문서 검색" }), {
      target: { value: "react" },
    });
    fireEvent.click(screen.getByRole("button", { name: "React 자세히" }));
    fireEvent.click(screen.getByRole("button", { name: "시작 화면에 고정" }));

    await waitFor(() => expect(onWindowsPin).toHaveBeenCalledOnce());
    expect(startButton.getAttribute("aria-expanded")).toBe("true");

    const searchItem = document.querySelector(".wb-task-search-result__main");
    if (!(searchItem instanceof HTMLButtonElement)) {
      throw new Error("search item button을 찾을 수 없습니다.");
    }

    expect(fireEvent.contextMenu(searchItem)).toBe(false);
    expect(onContextMenu).toHaveBeenCalledWith({ item: REACT, source: "search" });
    expect(startButton.getAttribute("aria-expanded")).toBe("true");
  });

});
