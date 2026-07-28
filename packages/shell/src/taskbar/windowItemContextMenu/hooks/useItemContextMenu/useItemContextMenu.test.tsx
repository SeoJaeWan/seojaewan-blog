import type { WindowItem } from "@window/ui";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useItemContextMenu } from ".";

const item: WindowItem = {
  description: "메모",
  id: "notes",
  title: "메모장",
};

describe("useItemContextMenu", () => {
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
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

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

  it("대상 item과 커서 위치를 열고 측정한 메뉴를 viewport 안에 배치한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 120,
        anchorY: 140,
        item,
        source: "all",
        triggerElement: null,
      });
    });

    expect(result.current.target).toEqual({
      anchorX: 120,
      anchorY: 140,
      item,
      source: "all",
    });
    expect(result.current.position).toEqual({
      left: 120,
      placement: "bottom",
      top: 140,
    });
  });

  it("열린 상태에서 새 항목을 요청하면 대상과 위치를 새 요청으로 교체한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");
    const nextItem = { ...item, id: "terminal", title: "터미널" };

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 100,
        anchorY: 100,
        item,
        source: "pinned",
        triggerElement: null,
      });
    });
    act(() => {
      result.current.open({
        anchorX: 760,
        anchorY: 580,
        item: nextItem,
        source: "search",
        triggerElement: null,
      });
    });

    expect(result.current.target?.item).toBe(nextItem);
    expect(result.current.target?.source).toBe("search");
    expect(result.current.position).toEqual({
      bottom: 20,
      placement: "top",
      right: 40,
    });
  });

  it("keyboard context 요청은 대상 요소의 왼쪽 아래 좌표를 사용한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");
    const triggerElement = document.createElement("button");

    prepareMenu(menuElement);
    vi.spyOn(triggerElement, "getBoundingClientRect").mockReturnValue({
      bottom: 180,
      height: 40,
      left: 160,
      right: 200,
      toJSON: () => ({}),
      top: 140,
      width: 40,
      x: 160,
      y: 140,
    });
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 0,
        anchorY: 0,
        item,
        source: "pinned",
        triggerElement,
      });
    });

    expect(result.current.position).toEqual({
      left: 160,
      placement: "bottom",
      top: 180,
    });
  });

  it("viewport 크기가 바뀌면 열린 메뉴의 좌표와 배치 방향을 다시 계산한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 650,
        anchorY: 550,
        item,
        source: "all",
        triggerElement: null,
      });
    });

    expect(result.current.position).toEqual({
      bottom: 50,
      placement: "top",
      right: 150,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.position).toEqual({
      left: 650,
      placement: "bottom",
      top: 550,
    });
  });

  it("Escape로 메뉴를 닫고 원래 항목에 focus를 복원한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");
    const triggerElement = document.createElement("button");
    const focusSpy = vi.spyOn(triggerElement, "focus");

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 100,
        anchorY: 100,
        item,
        source: "all",
        triggerElement,
      });
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.target).toBeNull();
    expect(result.current.position).toBeNull();
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("메뉴가 열려 있는 동안 document scroll을 막고 닫으면 해제한다", () => {
    const { result } = renderHook(useItemContextMenu);
    const menuElement = document.createElement("div");

    prepareMenu(menuElement);
    result.current.menuRef.current = menuElement;

    act(() => {
      result.current.open({
        anchorX: 100,
        anchorY: 100,
        item,
        source: "all",
        triggerElement: null,
      });
    });

    const lockedWheelEvent = new WheelEvent("wheel", { cancelable: true });

    document.dispatchEvent(lockedWheelEvent);
    expect(lockedWheelEvent.defaultPrevented).toBe(true);

    act(() => {
      result.current.close();
    });

    const releasedWheelEvent = new WheelEvent("wheel", { cancelable: true });

    document.dispatchEvent(releasedWheelEvent);
    expect(releasedWheelEvent.defaultPrevented).toBe(false);
  });
});
