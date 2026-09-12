import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions, FileExplorerTabView } from "../../../../../../headless/folders/index.js";
import { useFolderTabsViewport } from "./index.js";

const tabs = [
  { id: "tab-1", title: "첫째", active: true },
  { id: "tab-2", title: "둘째", active: false },
] as unknown as readonly FileExplorerTabView[];

const Harness = ({ actions }: { actions: FileExplorerControllerActions }) => {
  const viewport = useFolderTabsViewport({ actions, activeTabId: tabs[0].id, tabs });
  return (
    <div data-overflow={viewport.overflow} ref={viewport.viewportRef}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onKeyDown={(event) => viewport.handleTabKeyDown(event, index)}
          ref={viewport.registerTab(tab.id)}
          type="button"
        >
          {tab.title}
        </button>
      ))}
      <button onClick={() => viewport.scrollTabs(1)} type="button">scroll</button>
    </div>
  );
};

describe("useFolderTabsViewport", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("viewport overflow를 측정하고 폭의 75%만큼 스크롤한다", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(400);
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;
    const actions = { execute: vi.fn() } as unknown as FileExplorerControllerActions;

    render(<Harness actions={actions} />);

    expect(screen.getByText("첫째").parentElement?.dataset.overflow).toBe("true");
    fireEvent.click(screen.getByText("scroll"));
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ behavior: "smooth", left: 150 });
  });

  it("방향키가 다음 탭에 focus하고 활성화 Action을 전달하며 unmount에서 observer를 정리한다", () => {
    const disconnect = vi.fn();
    class TestResizeObserver {
      observe(): void {}
      disconnect(): void { disconnect(); }
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const execute = vi.fn();
    const actions = { execute } as unknown as FileExplorerControllerActions;
    const rendered = render(<Harness actions={actions} />);
    const first = screen.getByText("첫째");
    const second = screen.getByText("둘째");
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });

    expect(document.activeElement).toBe(second);
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "file-explorer.tab.activate",
      tabId: tabs[1].id,
    });
    rendered.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
