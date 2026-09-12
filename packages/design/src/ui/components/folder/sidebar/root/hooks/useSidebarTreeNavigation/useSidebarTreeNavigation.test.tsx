import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileExplorerControllerActions, FileExplorerSidebarItem, FileExplorerSidebarView } from "../../../../../../../headless/folders/index.js";
import { createResourceRef } from "../../../../../../../headless/resources/index.js";
import { useSidebarTreeNavigation } from "./index.js";

afterEach(cleanup);

const blog = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const react = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const blogRow: FileExplorerSidebarItem = {
  kind: "folder", ref: blog, name: "Blog", path: "/Blog", depth: 1,
  hasChildren: true, expanded: true, current: false, children: [],
};
const reactRow: FileExplorerSidebarItem = {
  kind: "folder", ref: react, name: "React", path: "/Blog/React", depth: 2,
  hasChildren: false, expanded: false, current: true, children: [],
};
const desktop = { kind: "desktop" as const, name: "Desktop" as const, path: "/" as const, current: false };
const sidebar: FileExplorerSidebarView = {
  visible: true, width: 240, desktop, items: [blogRow],
  currentRow: { kind: "folder", location: react },
  visibleRows: [desktop, blogRow, reactRow], expandedFolderIds: [blog.id],
};

describe("useSidebarTreeNavigation", () => {
  it("위아래 key는 roving focus를 옮기고 Enter는 현재 위치를 전달한다", () => {
    const execute = vi.fn();
    const actions = { execute } as unknown as FileExplorerControllerActions;
    const navigate = vi.fn();
    const hook = renderHook(() => useSidebarTreeNavigation({ actions, sidebar }));
    const blogElement = document.createElement("button");
    const reactElement = document.createElement("button");
    document.body.append(blogElement, reactElement);
    act(() => {
      hook.result.current.registerRow(`folder:${blog.id}`)(blogElement);
      hook.result.current.registerRow(`folder:${react.id}`)(reactElement);
    });

    act(() => hook.result.current.handleTreeKey({ key: "ArrowDown", preventDefault: vi.fn() } as never, blogRow, navigate));
    expect(document.activeElement).toBe(reactElement);
    act(() => hook.result.current.handleTreeKey({ key: "Enter", preventDefault: vi.fn() } as never, reactRow, navigate));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(react);
  });

  it("좌우 key는 현재 expanded identity 집합만 변경한다", () => {
    const execute = vi.fn();
    const actions = { execute } as unknown as FileExplorerControllerActions;
    const hook = renderHook(() => useSidebarTreeNavigation({ actions, sidebar }));

    act(() => hook.result.current.handleTreeKey({ key: "ArrowLeft", preventDefault: vi.fn() } as never, blogRow, vi.fn()));
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "file-explorer.sidebar.expansion.set",
      expandedFolderIds: [],
    });
  });

  it("예약한 행이 projection에 등록되면 focus하고 보이지 않는 focus는 현재 행으로 복구한다", () => {
    const actions = { execute: vi.fn() } as unknown as FileExplorerControllerActions;
    const hook = renderHook(({ view }) => useSidebarTreeNavigation({ actions, sidebar: view }), {
      initialProps: { view: sidebar },
    });
    const reactElement = document.createElement("button");
    document.body.append(reactElement);
    act(() => hook.result.current.requestFocus(`folder:${react.id}`));
    act(() => hook.result.current.registerRow(`folder:${react.id}`)(reactElement));
    hook.rerender({ view: { ...sidebar, visibleRows: [desktop, reactRow] } });
    expect(document.activeElement).toBe(reactElement);
    expect(hook.result.current.focusedKey).toBe(`folder:${react.id}`);
  });
});
