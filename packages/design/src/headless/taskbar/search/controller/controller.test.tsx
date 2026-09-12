import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createResourceRef, createStaticCatalog } from "../../../resources/index.js";
import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
} from "../../../runtime/index.js";
import type { WorkspaceState } from "../../../workspace/index.js";
import { useTaskbarSearchController } from "./index.js";

const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const state: WorkspaceState = {
  schemaVersion: 1,
  contentInbox: folder,
  folders: [{ ref: folder, name: "검색 폴더" }],
  placements: [{ resource: folder, parent: null }],
};

describe("useTaskbarSearchController", () => {
  it("Workspace 이름 변경도 구독하여 적용 query 결과를 현재 원본에서 다시 계산한다", async () => {
    let workspaceState = state;
    const listeners = new Set<() => void>();
    const workspace = {
      getSnapshot: () => workspaceState,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    } as unknown as NonNullable<HeadlessRuntimeAdapters["workspace"]>;
    const runtime = createHeadlessRuntime({
      adapters: { workspace },
      fileExplorerResources: {
        content: createStaticCatalog([]),
        externalShortcut: createStaticCatalog([]),
      },
    });
    await runtime.primaryPanel.execute({ type: "update-query", panel: "search", query: "검색" })
      .settled;
    await runtime.search.execute({
      type: "search.apply-query",
      panel: "search",
      query: "검색",
      version: runtime.search.getSnapshot().panels.search.version,
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(HeadlessRuntimeProvider, { runtime }, children);
    const hook = renderHook(useTaskbarSearchController, { wrapper });
    expect(hook.result.current.viewModel.results.search.map((match) => match.ref)).toEqual([
      folder,
    ]);
    act(() => {
      workspaceState = { ...state, folders: [{ ref: folder, name: "다른 이름" }] };
      for (const listener of listeners) listener();
    });
    expect(hook.result.current.viewModel.results.search).toEqual([]);
    expect(hook.result.current.viewModel.panels.search.query).toBe("검색");
    hook.unmount();
    expect(listeners.size).toBe(0);
  });

  it("server render는 Workspace singleton·Catalog·storage를 읽지 않는다", () => {
    const getSnapshot = vi.fn(() => state);
    const load = vi.fn();
    const workspace = { getSnapshot, subscribe: () => () => undefined } as unknown as NonNullable<
      HeadlessRuntimeAdapters["workspace"]
    >;
    const runtime = createHeadlessRuntime({
      adapters: { workspace },
      searchStorage: { load, save: vi.fn() },
      fileExplorerResources: {
        content: createStaticCatalog([]),
        externalShortcut: createStaticCatalog([]),
      },
    });
    const Probe = () => {
      const controller = useTaskbarSearchController();
      return createElement("span", null, String(controller.viewModel.ready));
    };
    expect(
      renderToString(createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe))),
    ).toContain("false");
    expect(getSnapshot).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });
});
