import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuOpenRequest } from "../../context";
import { useContextMenuValue } from ".";

const prepareMenu = (menuElement: HTMLDivElement) => {
  vi.spyOn(menuElement, "getBoundingClientRect").mockReturnValue({
    bottom: 0,
    height: 160,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 200,
    x: 0,
    y: 0,
  });
};

const createRequest = (options: Partial<ContextMenuOpenRequest> = {}): ContextMenuOpenRequest => ({
  anchorX: 100,
  anchorY: 100,
  animated: true,
  getEntries: () => [{ id: "open", label: "열기", type: "action" }],
  onAction: vi.fn(),
  ownerId: "owner",
  triggerElement: null,
  ...options,
});

describe("useContextMenuValue", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("요청한 기준점과 실제 menu 크기로 viewport 위치를 계산한다", () => {
    const { result } = renderHook(useContextMenuValue);
    const menuElement = document.createElement("div");

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.contextValue.open(
        createRequest({
          anchorX: 120,
          anchorY: 140,
        }),
      );
    });

    expect(result.current.position).toEqual({
      left: 120,
      placement: "bottom",
      top: 140,
    });
  });

  it("새 요청은 기존 메뉴를 replaced 원인으로 닫고 하나의 active request만 유지한다", () => {
    const { result } = renderHook(useContextMenuValue);
    const firstOnClose = vi.fn();
    const nextRequest = createRequest({ ownerId: "next" });

    act(() => {
      result.current.contextValue.open(createRequest({ onClose: firstOnClose }));
      result.current.contextValue.open(nextRequest);
    });

    expect(firstOnClose).toHaveBeenCalledWith("replaced");
    expect(result.current.activeMenu).toBe(nextRequest);
  });

  it("action 선택은 메뉴를 닫고 원래 trigger focus와 callback을 실행한다", () => {
    const { result } = renderHook(useContextMenuValue);
    const triggerElement = document.createElement("button");
    const onAction = vi.fn();
    const onClose = vi.fn();

    document.body.append(triggerElement);
    act(() => {
      result.current.contextValue.open(
        createRequest({
          onAction,
          onClose,
          triggerElement,
        }),
      );
    });
    act(() => {
      result.current.handleAction({
        id: "open",
        label: "열기",
        type: "action",
      });
    });

    expect(result.current.activeMenu).toBeNull();
    expect(document.activeElement).toBe(triggerElement);
    expect(onClose).toHaveBeenCalledWith("action");
    expect(onAction).toHaveBeenCalledWith("open");
  });

  it("focus 복원을 끈 action은 ancestor가 닫혀도 원래 trigger에 focus하지 않는다", () => {
    const { result } = renderHook(useContextMenuValue);
    const triggerElement = document.createElement("button");

    document.body.append(triggerElement);
    act(() => {
      result.current.contextValue.open(createRequest({ triggerElement }));
    });
    act(() => {
      result.current.handleAction({
        id: "openLocation",
        label: "파일 위치 열기",
        restoreFocus: false,
        type: "action",
      });
    });

    expect(document.activeElement).not.toBe(triggerElement);
  });

  it("Escape는 최상위 메뉴만 닫고 아래 panel의 keydown listener로 전달하지 않는다", () => {
    const underlyingListener = vi.fn();

    document.addEventListener("keydown", underlyingListener);

    const { result } = renderHook(useContextMenuValue);
    const onClose = vi.fn();

    act(() => {
      result.current.contextValue.open(createRequest({ onClose }));
    });

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(underlyingListener).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith("escape");
    expect(result.current.activeMenu).toBeNull();

    document.removeEventListener("keydown", underlyingListener);
  });

  it("메뉴 밖의 document scroll은 막고 메뉴가 닫히면 해제한다", () => {
    const { result } = renderHook(useContextMenuValue);
    const menuElement = document.createElement("div");

    document.body.append(menuElement);
    result.current.menuRef.current = menuElement;
    act(() => {
      result.current.contextValue.open(createRequest());
    });

    const lockedEvent = new WheelEvent("wheel", { cancelable: true });

    document.dispatchEvent(lockedEvent);
    expect(lockedEvent.defaultPrevented).toBe(true);

    act(() => {
      result.current.contextValue.close("programmatic");
    });

    const releasedEvent = new WheelEvent("wheel", { cancelable: true });

    document.dispatchEvent(releasedEvent);
    expect(releasedEvent.defaultPrevented).toBe(false);
  });

  it("Arrow key로 같은 menu의 action을 이동하고 submenu에 진입·복귀한다", () => {
    const { result } = renderHook(useContextMenuValue);
    const rootMenu = document.createElement("div");
    const firstAction = document.createElement("button");
    const submenuWrapper = document.createElement("div");
    const submenuTrigger = document.createElement("button");
    const subPanel = document.createElement("div");
    const nestedAction = document.createElement("button");
    const encodedPath = JSON.stringify(["sort"]);

    rootMenu.setAttribute("role", "menu");
    firstAction.setAttribute("role", "menuitem");
    submenuTrigger.setAttribute("role", "menuitem");
    submenuTrigger.dataset.contextMenuSubmenuPath = encodedPath;
    subPanel.setAttribute("role", "menu");
    subPanel.setAttribute("aria-hidden", "true");
    subPanel.dataset.contextMenuSubPanelPath = encodedPath;
    nestedAction.setAttribute("role", "menuitem");
    subPanel.append(nestedAction);
    submenuWrapper.append(submenuTrigger, subPanel);
    rootMenu.append(firstAction, submenuWrapper);
    document.body.append(rootMenu);
    result.current.menuRef.current = rootMenu;

    act(() => {
      result.current.contextValue.open(createRequest());
    });

    const preventDefault = vi.fn();

    act(() => {
      result.current.handleMenuKeyDown({
        key: "ArrowDown",
        preventDefault,
        target: firstAction,
      } as unknown as ReactKeyboardEvent<HTMLDivElement>);
    });
    expect(document.activeElement).toBe(submenuTrigger);

    act(() => {
      result.current.handleMenuKeyDown({
        key: "ArrowRight",
        preventDefault,
        target: submenuTrigger,
      } as unknown as ReactKeyboardEvent<HTMLDivElement>);
    });
    expect(result.current.openSubmenuPath).toEqual(["sort"]);
    expect(document.activeElement).toBe(nestedAction);

    act(() => {
      result.current.handleMenuKeyDown({
        key: "ArrowLeft",
        preventDefault,
        target: nestedAction,
      } as unknown as ReactKeyboardEvent<HTMLDivElement>);
    });
    expect(result.current.openSubmenuPath).toEqual([]);
    expect(document.activeElement).toBe(submenuTrigger);
  });
});
