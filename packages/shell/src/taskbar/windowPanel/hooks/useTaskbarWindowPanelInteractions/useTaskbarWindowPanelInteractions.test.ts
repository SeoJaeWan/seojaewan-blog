import type { MouseEvent } from "react";

import type { WindowItem, WindowItemActionId, WindowsPanelItemSource } from "@window/ui";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskbarWindowPanelInteractions } from "./index";

const dependencies = vi.hoisted(() => ({
  close: vi.fn(),
  dispatch: vi.fn(),
  taskbarIsPinned: vi.fn<(itemId: string) => boolean>(),
  taskbarPin: vi.fn(),
  taskbarUnpin: vi.fn(),
  windowsIsPinned: vi.fn<(itemId: string) => boolean>(),
  windowsPin: vi.fn(),
  windowsUnpin: vi.fn(),
}));

vi.mock("../../../../windows/providers/taskbarPinsProvider", () => ({
  useTaskbarPins: () => ({
    isPinned: dependencies.taskbarIsPinned,
    pin: dependencies.taskbarPin,
    pinnedIds: [],
    unpin: dependencies.taskbarUnpin,
  }),
}));

vi.mock("../../../../windows/providers/windowsEventsProvider", () => ({
  useWindowDispatch: () => dependencies.dispatch,
}));

vi.mock("../../../../windows/providers/windowsPinsProvider", () => ({
  useWindowsPins: () => ({
    isPinned: dependencies.windowsIsPinned,
    pin: dependencies.windowsPin,
    pinnedIds: [],
    reorder: vi.fn(),
    unpin: dependencies.windowsUnpin,
  }),
}));

vi.mock("../../../panel/hooks/useTaskbarPanelRootContext", () => ({
  useTaskbarPanelRootContext: () => ({ close: dependencies.close }),
}));

const REACT = { id: "react", title: "React" } satisfies WindowItem;

const renderInteractions = (detailItem: WindowItem | null = REACT) =>
  renderHook(() => useTaskbarWindowPanelInteractions(detailItem));

beforeEach(() => {
  vi.clearAllMocks();
  dependencies.taskbarIsPinned.mockReturnValue(false);
  dependencies.windowsIsPinned.mockReturnValue(false);
});

describe("useTaskbarWindowPanelInteractions", () => {
  describe("detail actions", () => {
    it("상세 item이 없으면 action을 제공하지 않는다", () => {
      const { result } = renderInteractions(null);

      expect(result.current.detailActions).toEqual([]);
    });

    it("상세 item의 현재 pin 상태에 맞는 action을 제공한다", () => {
      dependencies.windowsIsPinned.mockReturnValue(true);

      const { result } = renderInteractions();

      expect(result.current.detailActions).toEqual([
        { id: "openLocation" },
        { id: "unpinFromStart" },
        { id: "pinToTaskbar" },
      ]);
    });
  });

  describe("open", () => {
    it.each(["search", "pinned", "all"] as const)(
      "%s item을 열면 발생 화면을 보존해 dispatch하고 panel을 닫는다",
      (source) => {
        const { result } = renderInteractions();

        act(() => {
          result.current.onOpenItem(REACT, source);
        });

        expect(dependencies.close).toHaveBeenCalledOnce();
        expect(dependencies.dispatch).toHaveBeenCalledWith("windowOpen", {
          item: REACT,
          source,
        });
        expect(dependencies.close.mock.invocationCallOrder[0]).toBeLessThan(
          dependencies.dispatch.mock.invocationCallOrder[0],
        );
      },
    );

    it.each([
      { action: "open", eventName: "windowOpen" },
      { action: "openLocation", eventName: "windowOpenLocation" },
    ] as const)("$action action은 panel을 닫고 $eventName event를 전달한다", ({
      action,
      eventName,
    }) => {
      const { result } = renderInteractions();

      act(() => {
        result.current.onDetailAction(action, REACT);
      });

      expect(dependencies.close).toHaveBeenCalledOnce();
      expect(dependencies.dispatch).toHaveBeenCalledWith(eventName, {
        item: REACT,
        source: "search",
      });
    });
  });

  describe("pin", () => {
    it.each([
      { action: "pinToStart", expected: dependencies.windowsPin },
      { action: "unpinFromStart", expected: dependencies.windowsUnpin },
      { action: "pinToTaskbar", expected: dependencies.taskbarPin },
      { action: "unpinFromTaskbar", expected: dependencies.taskbarUnpin },
    ] satisfies readonly { action: WindowItemActionId; expected: ReturnType<typeof vi.fn> }[])(
      "$action action은 해당 pin action만 실행하고 panel을 유지한다",
      ({ action, expected }) => {
        const { result } = renderInteractions();

        act(() => {
          result.current.onDetailAction(action, REACT);
        });

        expect(expected).toHaveBeenCalledWith("react");
        expect(dependencies.close).not.toHaveBeenCalled();
        expect(dependencies.dispatch).not.toHaveBeenCalled();
      },
    );
  });

  describe("context menu", () => {
    it.each(["search", "pinned", "all"] as const)(
      "%s item은 native context menu를 막고 발생 화면을 보존해 dispatch한다",
      (source: WindowsPanelItemSource) => {
        const preventDefault = vi.fn();
        const { result } = renderInteractions();

        act(() => {
          result.current.onItemContextMenu(
            { preventDefault } as unknown as MouseEvent<HTMLButtonElement>,
            REACT,
            source,
          );
        });

        expect(preventDefault).toHaveBeenCalledOnce();
        expect(dependencies.dispatch).toHaveBeenCalledWith("windowContextMenuRequested", {
          item: REACT,
          source,
        });
        expect(dependencies.close).not.toHaveBeenCalled();
      },
    );
  });
});
