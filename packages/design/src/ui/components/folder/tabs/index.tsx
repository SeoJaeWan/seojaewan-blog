import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@base-ui/react/button";
import { Tabs } from "@base-ui/react/tabs";
import {
  Add20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Dismiss16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  FileExplorerControllerActions,
  FileExplorerReadModel,
  FileExplorerTabView,
} from "../../../../headless/folders/index.js";

import "./folderTabs.css";

/** File Explorer tab strip의 controlled 제품 입력이다. */
export type FolderTabsProps = Readonly<{
  /** tablist의 제품 접근성 이름이다. */
  ariaLabel?: string;
  /** 제품 layout에서 추가할 class 이름이다. */
  className?: string;
  /** 현재 활성 tab identity다. */
  activeTabId: FileExplorerTabView["id"];
  /** controller read model이 제공한 desktop tab 목록이다. */
  tabs: FileExplorerReadModel["tabs"];
  /** tab activate·close·add intent를 받는 controller 경계다. */
  actions: FileExplorerControllerActions;
}>;

/**
 * 줄어드는 tab, overflow 이동 control과 add·close 동작을 하나의 제품 tab strip으로 렌더링한다.
 *
 * Base UI Tabs가 좌우 roving focus와 끝 순환을 소유하며 제품은 선택 Action과 active 표시를 연결한다.
 */
export const FolderTabs = ({
  actions,
  activeTabId,
  ariaLabel = "파일 탐색기 탭",
  className,
  tabs,
}: FolderTabsProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef(new Map<FileExplorerTabView["id"], HTMLElement>());
  const [overflow, setOverflow] = useState(false);
  const visibleTabs = tabs ?? [];

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

  const scrollTabs = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    viewport.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(120, viewport.clientWidth * 0.75),
    });
  };

  if (tabs === null) return null;

  return (
    <Tabs.Root
      className={clsx("folder-tabs", className)}
      data-overflow={overflow ? "true" : "false"}
      onValueChange={(value) => {
        if (typeof value === "string" && value !== activeTabId) {
          void actions.execute({
            type: "file-explorer.tab.activate",
            tabId: value as FileExplorerTabView["id"],
          });
        }
      }}
      value={activeTabId}
    >
      {overflow ? (
        <Button
          aria-label="이전 탭 보기"
          className="folder-tabs__overflow-control"
          onClick={() => scrollTabs(-1)}
          type="button"
        >
          <ChevronLeft20Regular aria-hidden="true" />
        </Button>
      ) : null}
      <div className="folder-tabs__viewport" ref={viewportRef}>
        <Tabs.List aria-label={ariaLabel} className="folder-tabs__list" loopFocus>
          {visibleTabs.map((tab, index) => (
            <span
              className="folder-tabs__item"
              data-active={tab.active ? "true" : undefined}
              key={tab.id}
            >
              <Tabs.Tab
                className="folder-tabs__tab"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const offset = event.key === "ArrowLeft" ? -1 : 1;
                  const next =
                    visibleTabs[(index + offset + visibleTabs.length) % visibleTabs.length];
                  if (next === undefined) return;
                  tabRefs.current.get(next.id)?.focus();
                  if (next.id !== activeTabId) {
                    void actions.execute({
                      type: "file-explorer.tab.activate",
                      tabId: next.id,
                    });
                  }
                }}
                ref={(node) => {
                  if (node === null) tabRefs.current.delete(tab.id);
                  else tabRefs.current.set(tab.id, node);
                  if (tab.id === activeTabId) activeRef.current = node;
                }}
                title={tab.address}
                value={tab.id}
              >
                <span className="folder-tabs__title">{tab.title}</span>
              </Tabs.Tab>
              <Button
                aria-label={`${tab.title} 탭 닫기`}
                className="folder-tabs__close"
                onClick={() =>
                  void actions.execute({ type: "file-explorer.tab.close", tabId: tab.id })
                }
                type="button"
              >
                <Dismiss16Regular aria-hidden="true" />
              </Button>
            </span>
          ))}
        </Tabs.List>
      </div>
      {overflow ? (
        <Button
          aria-label="다음 탭 보기"
          className="folder-tabs__overflow-control"
          onClick={() => scrollTabs(1)}
          type="button"
        >
          <ChevronRight20Regular aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        aria-label="새 탭"
        className="folder-tabs__add"
        onClick={() => void actions.execute({ type: "file-explorer.tab.add" })}
        type="button"
      >
        <Add20Regular aria-hidden="true" />
      </Button>
    </Tabs.Root>
  );
};
