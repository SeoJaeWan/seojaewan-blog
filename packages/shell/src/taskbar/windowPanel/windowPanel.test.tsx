import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Windows } from "../../windows";
import { useWindowEvent } from "../../windows/hooks/useWindowEvent";
import { TASKBAR_PIN_STORAGE_KEY } from "../../windows/providers/taskbarPinsProvider/constants";
import { WINDOWS_PIN_STORAGE_KEY } from "../../windows/providers/windowsPinsProvider/constants";
import type { WindowContextMenuEvent, WindowItemEvent, WindowPinEvent } from "../../windows/types";
import { TaskbarPanelHost } from "../panelHost";
import { TaskbarWindowPanel } from "./index";

const WINDOW_PIN_STORAGE_KEYS = {
  taskbar: TASKBAR_PIN_STORAGE_KEY,
  windows: WINDOWS_PIN_STORAGE_KEY,
} as const;

const REACT = { id: "react", title: "React" } satisfies WindowItem;
const REDUX = { id: "redux", title: "Redux" } satisfies WindowItem;
const MEDIA = { id: "media", title: "미디어" } satisfies WindowItem;
const RESULTS = [REACT, REDUX, MEDIA] satisfies readonly WindowItem[];

interface ObserverProps {
  onContextMenu?: (event: WindowContextMenuEvent) => void;
  onOpen?: (event: WindowItemEvent) => void;
  onOpenLocation?: (event: WindowItemEvent) => void;
  onTaskbarPin?: (event: WindowPinEvent) => void;
  onTaskbarUnpin?: (event: WindowPinEvent) => void;
  onWindowsPin?: (event: WindowPinEvent) => void;
  onWindowsUnpin?: (event: WindowPinEvent) => void;
}

const Observer = ({
  onContextMenu,
  onOpen,
  onOpenLocation,
  onTaskbarPin,
  onTaskbarUnpin,
  onWindowsPin,
  onWindowsUnpin,
}: ObserverProps) => {
  useWindowEvent("windowContextMenuRequested", (event) => onContextMenu?.(event));
  useWindowEvent("windowOpen", (event) => onOpen?.(event));
  useWindowEvent("windowOpenLocation", (event) => onOpenLocation?.(event));
  useWindowEvent("windowPinToStart", (event) => onWindowsPin?.(event));
  useWindowEvent("windowPinToTaskbar", (event) => onTaskbarPin?.(event));
  useWindowEvent("windowUnpinFromStart", (event) => onWindowsUnpin?.(event));
  useWindowEvent("windowUnpinFromTaskbar", (event) => onTaskbarUnpin?.(event));
  return null;
};

const createTree = (windowsItems: readonly WindowItem[], observerProps: ObserverProps = {}) => (
  <Windows windowsItems={windowsItems}>
    <TaskbarPanelHost portalContainer={document.body}>
      <Observer {...observerProps} />
      <TaskbarWindowPanel id="start-panel" />
    </TaskbarPanelHost>
  </Windows>
);

const getSearchInput = () => screen.getByRole("textbox", { name: "앱 및 문서 검색" });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("TaskbarWindowPanel", () => {
  it("지역 검색어가 비어 있으면 전체 item을 section으로 변환한다", () => {
    const { container } = render(createTree(RESULTS));

    expect(screen.getByRole("dialog", { name: "시작" }).id).toBe("start-panel");
    expect((getSearchInput() as HTMLInputElement).value).toBe("");

    fireEvent.change(getSearchInput(), { target: { value: "   " } });
    expect(screen.queryByRole("heading", { name: "최적의 일치" })).toBeNull();

    const views = container.querySelector(".wb-windows-panel__views");
    expect(views?.getAttribute("data-view")).toBe("pinned");

    fireEvent.click(screen.getByRole("button", { name: /^모두/ }));

    expect(views?.getAttribute("data-view")).toBe("all");
    expect(container.querySelector('[data-category="R"]')?.textContent).toBe("R");
    expect(container.querySelector('[data-category="ㅁ"]')?.textContent).toBe("ㅁ");
  });

  it("검색 상세 선택 뒤 windowsItems가 갱신되면 같은 ID의 최신 item을 렌더링한다", () => {
    const { container, rerender } = render(createTree(RESULTS));

    fireEvent.change(getSearchInput(), { target: { value: "re" } });
    fireEvent.click(screen.getByRole("button", { name: "React 자세히" }));
    expect(container.querySelector(".wb-task-search-result__detail-title")?.textContent).toBe(
      "React",
    );

    const updatedItem: WindowItem = { id: "react", title: "React 업데이트" };
    rerender(createTree([updatedItem, ...RESULTS.slice(1)]));

    expect(container.querySelector(".wb-task-search-result__detail-title")?.textContent).toBe(
      "React 업데이트",
    );
  });

  it("상세 action을 고정 구성하고 현재 pin 상태에 맞춰 전환한다", async () => {
    const onTaskbarPin = vi.fn();
    const onTaskbarUnpin = vi.fn();
    const onWindowsPin = vi.fn();
    const onWindowsUnpin = vi.fn();

    render(
      createTree(RESULTS, {
        onTaskbarPin,
        onTaskbarUnpin,
        onWindowsPin,
        onWindowsUnpin,
      }),
    );
    fireEvent.change(getSearchInput(), { target: { value: "react" } });
    fireEvent.click(screen.getByRole("button", { name: "React 자세히" }));

    expect(screen.getByRole("button", { name: "파일 위치 열기" }).hasAttribute("disabled")).toBe(
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "시작 화면에 고정" }));
    fireEvent.click(screen.getByRole("button", { name: "작업 표시줄에 고정" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "시작 화면에서 제거" }).hasAttribute("disabled"),
      ).toBe(false);
      expect(
        screen.getByRole("button", { name: "작업 표시줄에서 제거" }).hasAttribute("disabled"),
      ).toBe(false);
    });
    expect(onWindowsPin).toHaveBeenCalledWith({
      itemId: "react",
      pinnedIds: ["react"],
      previousPinnedIds: [],
    });
    expect(onTaskbarPin).toHaveBeenCalledWith({
      itemId: "react",
      pinnedIds: ["react"],
      previousPinnedIds: [],
    });
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["react"]),
    );
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(
      JSON.stringify(["react"]),
    );

    fireEvent.click(screen.getByRole("button", { name: "시작 화면에서 제거" }));
    fireEvent.click(screen.getByRole("button", { name: "작업 표시줄에서 제거" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "시작 화면에 고정" })).toBeDefined();
      expect(screen.getByRole("button", { name: "작업 표시줄에 고정" })).toBeDefined();
    });
    expect(onWindowsUnpin).toHaveBeenCalledWith({
      itemId: "react",
      pinnedIds: [],
      previousPinnedIds: ["react"],
    });
    expect(onTaskbarUnpin).toHaveBeenCalledWith({
      itemId: "react",
      pinnedIds: [],
      previousPinnedIds: ["react"],
    });
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(JSON.stringify([]));
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(JSON.stringify([]));
  });

  it("pinned와 all item open event에 발생 화면을 보존한다", async () => {
    const onOpen = vi.fn();

    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, JSON.stringify(["react"]));
    const { container } = render(createTree(RESULTS, { onOpen }));

    await waitFor(() =>
      expect(container.querySelector(".wb-windows-panel__pinned-item")).not.toBeNull(),
    );
    const pinnedItem = container.querySelector(".wb-windows-panel__pinned-item");
    if (!(pinnedItem instanceof HTMLButtonElement)) {
      throw new Error("pinned item button을 찾을 수 없습니다.");
    }

    fireEvent.click(pinnedItem);
    expect(onOpen).toHaveBeenLastCalledWith({ item: REACT, source: "pinned" });

    fireEvent.click(screen.getByRole("button", { name: /^모두/ }));
    const allItem = container.querySelector(".wb-windows-panel__item");
    if (!(allItem instanceof HTMLButtonElement)) {
      throw new Error("all item button을 찾을 수 없습니다.");
    }

    fireEvent.click(allItem);
    expect(onOpen).toHaveBeenLastCalledWith({ item: REACT, source: "all" });
  });

  it("context menu 기본 동작을 막고 search/pinned/all source만 dispatch한다", async () => {
    const onContextMenu = vi.fn();

    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, JSON.stringify(["react"]));
    const { container } = render(createTree(RESULTS, { onContextMenu }));

    fireEvent.change(getSearchInput(), { target: { value: "react" } });
    const searchItem = container.querySelector(".wb-task-search-result__main");
    if (!(searchItem instanceof HTMLButtonElement)) {
      throw new Error("search item button을 찾을 수 없습니다.");
    }

    expect(fireEvent.contextMenu(searchItem)).toBe(false);
    expect(onContextMenu).toHaveBeenLastCalledWith({ item: REACT, source: "search" });

    fireEvent.change(getSearchInput(), { target: { value: "" } });
    await waitFor(() =>
      expect(container.querySelector(".wb-windows-panel__pinned-item")).not.toBeNull(),
    );
    const pinnedItem = container.querySelector(".wb-windows-panel__pinned-item");
    if (!(pinnedItem instanceof HTMLButtonElement)) {
      throw new Error("pinned item button을 찾을 수 없습니다.");
    }

    expect(fireEvent.contextMenu(pinnedItem)).toBe(false);
    expect(onContextMenu).toHaveBeenLastCalledWith({ item: REACT, source: "pinned" });

    fireEvent.click(screen.getByRole("button", { name: /^모두/ }));
    const allItem = container.querySelector(".wb-windows-panel__item");
    if (!(allItem instanceof HTMLButtonElement)) {
      throw new Error("all item button을 찾을 수 없습니다.");
    }

    expect(fireEvent.contextMenu(allItem)).toBe(false);
    expect(onContextMenu).toHaveBeenLastCalledWith({ item: REACT, source: "all" });
  });

  it("사라진 pinned item의 exit lifecycle을 view에 연결한다", async () => {
    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, JSON.stringify(["react"]));
    const { container, rerender } = render(createTree(RESULTS));

    await waitFor(() =>
      expect(container.querySelector(".wb-windows-panel__pinned-item")).not.toBeNull(),
    );
    rerender(createTree([REDUX, MEDIA]));

    await waitFor(() =>
      expect(container.querySelector(".wb-windows-panel__pinned-item--out")).not.toBeNull(),
    );
    const staleItem = container.querySelector(".wb-windows-panel__pinned-item");
    if (!(staleItem instanceof HTMLButtonElement)) {
      throw new Error("stale pinned item button을 찾을 수 없습니다.");
    }

    fireEvent.transitionEnd(staleItem, { propertyName: "transform" });

    await waitFor(() =>
      expect(container.querySelector(".wb-windows-panel__pinned-item")).toBeNull(),
    );
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(JSON.stringify([]));
  });
});
