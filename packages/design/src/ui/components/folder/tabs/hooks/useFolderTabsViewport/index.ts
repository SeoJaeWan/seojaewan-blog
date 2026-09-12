import { type KeyboardEvent,useLayoutEffect, useRef, useState } from "react";

import type {
  FileExplorerControllerActions,
  FileExplorerTabView,
} from "../../../../../../headless/folders/index.js";

type UseFolderTabsViewportOptions = Readonly<{
  actions: FileExplorerControllerActions;
  activeTabId: FileExplorerTabView["id"];
  tabs: readonly FileExplorerTabView[];
}>;

/**
 * 탭 viewport의 overflow 측정, 활성 탭 노출, roving focus DOM 생명주기를 소유한다.
 */
export const useFolderTabsViewport = ({
  actions,
  activeTabId,
  tabs,
}: UseFolderTabsViewportOptions) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef(new Map<FileExplorerTabView["id"], HTMLElement>());
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;

    const measure = () => setOverflow(viewport.scrollWidth > viewport.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tabs]);

  useLayoutEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  /**
   * viewport 폭을 기준으로 앞뒤 탭 묶음을 스크롤한다.
   */
  const scrollTabs = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    viewport.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(120, viewport.clientWidth * 0.75),
    });
  };

  /**
   * 탭 DOM 참조를 identity별로 등록하고 현재 활성 탭을 추적한다.
   */
  const registerTab = (tabId: FileExplorerTabView["id"]) => (node: HTMLElement | null) => {
    if (node === null) tabRefs.current.delete(tabId);
    else tabRefs.current.set(tabId, node);
    if (tabId === activeTabId) activeRef.current = node;
  };

  /**
   * 방향키 이동 시 다음 탭에 focus를 주고 controller 선택을 동기화한다.
   */
  const handleTabKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    if (next === undefined) return;
    tabRefs.current.get(next.id)?.focus();
    if (next.id !== activeTabId) {
      void actions.execute({ type: "file-explorer.tab.activate", tabId: next.id });
    }
  };

  return { handleTabKeyDown, overflow, registerTab, scrollTabs, viewportRef } as const;
};
