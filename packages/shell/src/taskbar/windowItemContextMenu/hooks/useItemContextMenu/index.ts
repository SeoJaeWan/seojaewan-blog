"use client";

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { ContextMenuPosition, WindowItem } from "@window/ui";

import type { WindowsPanelItemSource } from "../../../../windows/types";
import { resolveContextMenuPosition } from "../../utils/resolveContextMenuPosition";

export interface ItemContextMenuTarget {
  /** 메뉴 위치 계산에 사용하는 pointer 또는 keyboard 기준점의 x 좌표. */
  anchorX: number;
  /** 메뉴 위치 계산에 사용하는 pointer 또는 keyboard 기준점의 y 좌표. */
  anchorY: number;
  /** Context Menu action 대상 WindowItem. */
  item: WindowItem;
  /** 요청이 발생한 pinned/all/search 화면. */
  source: WindowsPanelItemSource;
}

export interface OpenItemContextMenuOptions extends ItemContextMenuTarget {
  /** Context Menu가 닫힐 때 focus를 복원할 원래 item element. */
  triggerElement: HTMLElement | null;
}

export interface CloseItemContextMenuOptions {
  /** false이면 원래 item element로 focus를 복원하지 않는다. 기본값은 true다. */
  restoreFocus?: boolean;
}

export interface UseItemContextMenu {
  /** Context Menu를 즉시 닫는다. */
  close: (options?: CloseItemContextMenuOptions) => void;
  /** 실제 menu surface의 크기 측정과 초기 focus에 사용하는 ref. */
  menuRef: RefObject<HTMLDivElement | null>;
  /** 대상 item과 요청 좌표를 저장하고 Context Menu를 연다. */
  open: (options: OpenItemContextMenuOptions) => void;
  /** 측정이 끝난 뒤 ContextMenuUI에 전달할 viewport 좌표. */
  position: ContextMenuPosition | null;
  /** 현재 열린 Context Menu의 대상. 닫혀 있으면 null이다. */
  target: ItemContextMenuTarget | null;
}

/**
 * WindowItem Context Menu의 대상, 측정 위치, focus와 전역 browser lifecycle을 관리한다.
 * action 계산과 실행, Portal 및 visual rendering은 소유하지 않는다.
 *
 * @returns Context Menu target, position, menu ref와 open/close action
 */
export const useItemContextMenu = (): UseItemContextMenu => {
  const [target, setTarget] = useState<ItemContextMenuTarget | null>(null);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const focusedTargetRef = useRef<ItemContextMenuTarget | null>(null);

  const close = useCallback(({ restoreFocus = true }: CloseItemContextMenuOptions = {}) => {
    const triggerElement = triggerRef.current;

    setTarget(null);
    setPosition(null);
    focusedTargetRef.current = null;
    triggerRef.current = null;

    if (restoreFocus) {
      triggerElement?.focus();
    }
  }, []);

  const open = useCallback(
    ({ anchorX, anchorY, item, source, triggerElement }: OpenItemContextMenuOptions) => {
      const triggerRect =
        anchorX === 0 && anchorY === 0 ? triggerElement?.getBoundingClientRect() : null;
      const nextTarget: ItemContextMenuTarget = {
        anchorX: triggerRect?.left ?? anchorX,
        anchorY: triggerRect?.bottom ?? anchorY,
        item,
        source,
      };

      triggerRef.current = triggerElement;
      focusedTargetRef.current = null;
      setPosition(null);
      setTarget(nextTarget);
    },
    [],
  );

  const updatePosition = useCallback(() => {
    const menuElement = menuRef.current;

    if (menuElement === null || target === null) {
      return;
    }

    const menuRect = menuElement.getBoundingClientRect();

    setPosition(
      resolveContextMenuPosition({
        anchorX: target.anchorX,
        anchorY: target.anchorY,
        menuHeight: menuRect.height,
        menuWidth: menuRect.width,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, [target]);

  useLayoutEffect(() => {
    if (target === null || position !== null) {
      return;
    }

    updatePosition();
  }, [position, target, updatePosition]);

  useLayoutEffect(() => {
    if (position === null || target === null || focusedTargetRef.current === target) {
      return;
    }

    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    focusedTargetRef.current = target;
  }, [position, target]);

  useEffect(() => {
    if (target === null) {
      return;
    }

    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [target, updatePosition]);

  useEffect(() => {
    if (target === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const preventBackgroundScroll = (event: Event) => {
      const eventTarget = event.target;

      if (eventTarget instanceof Node && menuRef.current?.contains(eventTarget)) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchmove", preventBackgroundScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("wheel", preventBackgroundScroll, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchmove", preventBackgroundScroll, true);
      document.removeEventListener("wheel", preventBackgroundScroll, true);
    };
  }, [close, target]);

  return {
    close,
    menuRef,
    open,
    position,
    target,
  };
};
