import { useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type {
  FileExplorerAction,
  FileExplorerControllerActions,
  FileExplorerExecution,
  FileExplorerLocation,
  FileExplorerSidebarContextMenu,
  FileExplorerSidebarItem,
  FileExplorerSidebarView,
} from "../../../../../headless/folders/index.js";
import { parseFileExplorerTabId } from "../../../../../headless/folders/index.js";
import { createResourceRef } from "../../../../../headless/resources/index.js";
import type { OperationId } from "../../../../../headless/runtime/index.js";
import { parseWindowSessionId } from "../../../../../headless/windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../../../../headless/workspace/index.js";
import { FileExplorerSidebar } from "./index.js";

beforeAll(() => {
  class TestResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
});

afterEach(() => cleanup());

const blog = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const react = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const sessionId = parseWindowSessionId("10000000-0000-4000-8000-000000000001");
const tabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000001");

const reactItem: FileExplorerSidebarItem = Object.freeze({
  kind: "folder",
  ref: react,
  name: "React",
  path: "/Blog/React",
  depth: 2,
  hasChildren: false,
  expanded: false,
  current: true,
  children: Object.freeze([]),
});
const blogItem: FileExplorerSidebarItem = Object.freeze({
  kind: "folder",
  ref: blog,
  name: "Blog",
  path: "/Blog",
  depth: 1,
  hasChildren: true,
  expanded: true,
  current: false,
  children: Object.freeze([reactItem]),
});

const createSidebar = (
  overrides: Partial<FileExplorerSidebarView> = {},
): FileExplorerSidebarView =>
  Object.freeze({
    visible: true,
    width: 240,
    desktop: Object.freeze({
      kind: "desktop" as const,
      name: "Desktop" as const,
      path: "/" as const,
      current: false,
    }),
    items: Object.freeze([blogItem]),
    currentRow: Object.freeze({ kind: "folder" as const, location: react }),
    visibleRows: Object.freeze([
      Object.freeze({
        kind: "desktop" as const,
        name: "Desktop" as const,
        path: "/" as const,
        current: false,
      }),
      blogItem,
      reactItem,
    ]),
    expandedFolderIds: Object.freeze([blog.id]),
    ...overrides,
  });

const unavailable = (): FileExplorerExecution =>
  Object.freeze({ status: "unavailable" as const, reason: "not-ready" as const });

const createActions = (
  implementation: (action: FileExplorerAction) => FileExplorerExecution = unavailable,
) => {
  const execute = vi.fn(implementation);
  const actions: FileExplorerControllerActions = Object.freeze({ execute });
  return { actions, execute };
};

const menuFor = (location: FileExplorerLocation): FileExplorerSidebarContextMenu =>
  Object.freeze({
    target: Object.freeze({
      surface: "file-explorer" as const,
      sessionId,
      tabId,
      location,
      ...(location === null ? {} : { resource: location }),
    }),
    capability: Object.freeze({
      open: location !== null,
      openInNewWindow: true,
      createFolder: true,
      rename: location !== null,
      pinToStart: location !== null,
    }),
    entries: Object.freeze(
      location === null
        ? [
            Object.freeze({
              kind: "action" as const,
              id: "create-folder",
              label: "새 폴더",
              action: Object.freeze({
                type: "file-explorer.folder.create.begin" as const,
                parent: null,
                suggestedName: "새 폴더",
              }),
            }),
          ]
        : [
            Object.freeze({
              kind: "action" as const,
              id: "open-in-new-window",
              label: "새 창에서 열기",
              action: Object.freeze({
                type: "file-explorer.window.open" as const,
                location,
              }),
            }),
            Object.freeze({
              kind: "action" as const,
              id: "rename-folder",
              label: "이름 바꾸기",
              action: Object.freeze({
                type: "file-explorer.folder.rename.begin" as const,
                folder: location,
                currentName: location.id === blog.id ? "Blog" : "React",
              }),
            }),
            Object.freeze({
              kind: "action" as const,
              id: "pin-to-start",
              label: "시작 화면에 고정",
              action: Object.freeze({
                type: "file-explorer.start.pin" as const,
                resource: location,
              }),
            }),
          ],
    ),
  });

describe("FileExplorerSidebar", () => {
  it("mobile projection에는 Sidebar DOM을 만들지 않는다", () => {
    const { actions } = createActions();
    render(
      <FileExplorerSidebar actions={actions} getContextMenu={() => null} sidebar={null} />,
    );
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("Desktop부터 nested Folder visible rows를 tree semantics와 current state로 렌더링한다", () => {
    const { actions } = createActions();
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );

    expect(screen.getByRole("tree", { name: "폴더" })).toBeTruthy();
    const rows = screen.getAllByRole("treeitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Desktop", "Blog", "React"]);
    expect(rows.map((row) => row.getAttribute("aria-level"))).toEqual(["1", "2", "3"]);
    expect(screen.getByRole("treeitem", { name: "React" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("row focus와 click·Enter를 selection clear와 current-tab navigation Action에 연결한다", () => {
    const { actions, execute } = createActions();
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    const desktopRow = screen.getByRole("treeitem", { name: "Desktop" });
    const blogRow = screen.getByRole("treeitem", { name: "Blog" });

    blogRow.focus();
    fireEvent.click(blogRow);
    fireEvent.keyDown(desktopRow, { key: "Enter" });

    expect(execute).toHaveBeenNthCalledWith(1, {
      type: "file-explorer.selection.set",
      selection: [],
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      type: "file-explorer.navigation.navigate",
      location: blog,
    });
    expect(execute).toHaveBeenNthCalledWith(3, {
      type: "file-explorer.navigation.navigate",
      location: null,
    });
  });

  it("Up/Down은 visible row focus만, Left/Right는 Folder expansion만 바꾼다", () => {
    const { actions, execute } = createActions();
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    const blogRow = screen.getByRole("treeitem", { name: "Blog" });
    const reactRow = screen.getByRole("treeitem", { name: "React" });

    fireEvent.focus(blogRow);
    execute.mockClear();
    fireEvent.keyDown(blogRow, { key: "ArrowDown" });
    expect(document.activeElement).toBe(reactRow);
    fireEvent.keyDown(blogRow, { key: "ArrowLeft" });

    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.sidebar.expansion.set",
      expandedFolderIds: [],
    });
    expect(execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "file-explorer.navigation.navigate" }),
    );
  });

  it("우클릭은 navigation 없이 invocation row menu Action만 실행한다", async () => {
    const { actions, execute } = createActions((action) => {
      if (action.type === "file-explorer.folder.rename.begin") {
        return Object.freeze({
          status: "inline-edit-request" as const,
          kind: "rename" as const,
          folder: action.folder,
          initialName: action.currentName,
        });
      }
      return unavailable();
    });
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );

    const sidebarElement = screen.getByRole("complementary", { name: "폴더 사이드바" });
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Blog" }), {
      clientX: 40,
      clientY: 40,
    });
    const menuItem = await screen.findByRole("menuitem", { name: "이름 바꾸기" });
    expect(sidebarElement.contains(menuItem)).toBe(false);
    fireEvent.click(menuItem);

    const input = await screen.findByRole<HTMLInputElement>("textbox", {
      name: "폴더 이름 바꾸기",
    });
    expect(input.value).toBe("Blog");
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(4);
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.folder.rename.begin",
      folder: blog,
      currentName: "Blog",
    });
  });

  it("Context Menu는 Escape와 outside pointer로 닫히고 invocation row focus를 복원한다", async () => {
    const { actions, execute } = createActions();
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    const blogRow = screen.getByRole("treeitem", { name: "Blog" });
    blogRow.focus();
    execute.mockClear();

    fireEvent.contextMenu(blogRow, { clientX: 40, clientY: 40 });
    const escapeItem = await screen.findByRole("menuitem", { name: "이름 바꾸기" });
    fireEvent.keyDown(escapeItem, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "이름 바꾸기" })).toBeNull(),
    );
    expect(document.activeElement).toBe(blogRow);

    fireEvent.contextMenu(blogRow, { clientX: 50, clientY: 50 });
    await screen.findByRole("menuitem", { name: "이름 바꾸기" });
    fireEvent.pointerDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "이름 바꾸기" })).toBeNull(),
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("Context Menu entry의 Window와 Start target Action을 그대로 한 번 전달한다", async () => {
    const { actions, execute } = createActions();
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    const blogRow = screen.getByRole("treeitem", { name: "Blog" });

    fireEvent.contextMenu(blogRow);
    fireEvent.click(await screen.findByRole("menuitem", { name: "새 창에서 열기" }));
    fireEvent.contextMenu(blogRow);
    fireEvent.click(await screen.findByRole("menuitem", { name: "시작 화면에 고정" }));

    expect(execute).toHaveBeenNthCalledWith(1, {
      type: "file-explorer.window.open",
      location: blog,
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      type: "file-explorer.start.pin",
      resource: blog,
    });
  });

  it("외부 navigation의 current row 갱신은 기존 DOM focus를 가져오지 않는다", () => {
    const { actions } = createActions();
    const outside = document.createElement("button");
    document.body.append(outside);
    const { rerender } = render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    outside.focus();

    rerender(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar({
          currentRow: Object.freeze({ kind: "folder" as const, location: blog }),
        })}
      />,
    );

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("rename 검증 거절은 draft와 focus를 유지하고 Esc는 원래 row를 복원한다", async () => {
    const committed = Promise.resolve({
      status: "rejected" as const,
      result: Object.freeze({ ok: false as const, reason: "folder-name-conflict" as const }),
    });
    const { actions, execute } = createActions((action) => {
      if (action.type === "file-explorer.folder.rename.begin") {
        return Object.freeze({
          status: "inline-edit-request" as const,
          kind: "rename" as const,
          folder: action.folder,
          initialName: action.currentName,
        });
      }
      if (action.type === "file-explorer.folder.rename") {
        return Object.freeze({
          operationId: "operation-1" as OperationId,
          committed,
          presented: Promise.resolve({ status: "not-required" as const }),
          settled: Promise.resolve({
            status: "settled" as const,
            storeResult: Object.freeze({
              ok: false as const,
              reason: "folder-name-conflict" as const,
            }),
            presentation: Object.freeze({ status: "not-required" as const }),
          }),
        });
      }
      return unavailable();
    });
    render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        sidebar={createSidebar()}
      />,
    );
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Blog" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "이름 바꾸기" }));
    const input = await screen.findByRole<HTMLInputElement>("textbox", {
      name: "폴더 이름 바꾸기",
    });
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByRole("alert");
    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.folder.rename",
      folder: blog,
      name: "React",
    });
    expect(input.value).toBe("React");
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "폴더 이름 바꾸기" })).toBeNull();
    expect(screen.getByRole("treeitem", { name: "Blog" })).toBeTruthy();
  });

  it("create semantic commit 뒤 storage settle을 기다리지 않고 새 row에 focus한다", async () => {
    const created = createResourceRef("folder", "30000000-0000-4000-8000-000000000003");
    const createdItem: FileExplorerSidebarItem = Object.freeze({
      kind: "folder",
      ref: created,
      name: "새 폴더",
      path: "/새 폴더",
      depth: 1,
      hasChildren: false,
      expanded: false,
      current: false,
      children: Object.freeze([]),
    });
    const committedWorkspace: WorkspaceState = Object.freeze({
      schemaVersion: 1,
      contentInbox: blog,
      folders: Object.freeze([
        Object.freeze({ ref: blog, name: "Blog" }),
        Object.freeze({ ref: react, name: "React" }),
        Object.freeze({ ref: created, name: "새 폴더" }),
      ]),
      placements: Object.freeze([
        Object.freeze({ resource: blog, parent: null }),
        Object.freeze({ resource: react, parent: blog }),
        Object.freeze({ resource: created, parent: null }),
      ]),
    });
    let settleMutation: (() => void) | undefined;
    const settled = new Promise<never>(() => {
      settleMutation = () => undefined;
    });
    const { actions, execute } = createActions((action) => {
      if (action.type === "file-explorer.folder.create.begin") {
        return Object.freeze({
          status: "inline-edit-request" as const,
          kind: "create" as const,
          parent: action.parent,
          initialName: action.suggestedName,
        });
      }
      if (action.type === "file-explorer.folder.create") {
        return Object.freeze({
          operationId: "operation-2" as OperationId,
          committed: Promise.resolve({ status: "committed" as const, value: committedWorkspace }),
          presented: Promise.resolve({ status: "not-required" as const }),
          settled,
        });
      }
      return unavailable();
    });

    const Fixture = () => {
      const [model, setModel] = useState(createSidebar());
      return (
        <FileExplorerSidebar
          actions={Object.freeze({
            execute: (action) => {
              const result = actions.execute(action);
              if (action.type === "file-explorer.folder.create") {
                queueMicrotask(() =>
                  setModel(
                    createSidebar({
                      items: Object.freeze([blogItem, createdItem]),
                      visibleRows: Object.freeze([
                        createSidebar().desktop,
                        blogItem,
                        reactItem,
                        createdItem,
                      ]),
                    }),
                  ),
                );
              }
              return result;
            },
          })}
          getContextMenu={menuFor}
          sidebar={model}
        />
      );
    };

    render(<Fixture />);
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Desktop" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "새 폴더" }));
    const input = await screen.findByRole<HTMLInputElement>("textbox", { name: "새 폴더 이름" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: "새 폴더" })));
    expect(execute).toHaveBeenCalledWith({
      type: "file-explorer.folder.create",
      parent: null,
      name: "새 폴더",
    });
    expect(screen.queryByRole("textbox", { name: "새 폴더 이름" })).toBeNull();
    expect(settleMutation).toBeTypeOf("function");
  });

  it("resize handle은 pointer drag만 Window-local width Action으로 clamp한다", () => {
    const { actions, execute } = createActions();
    const { container } = render(
      <FileExplorerSidebar
        actions={actions}
        getContextMenu={menuFor}
        maximumWidth={320}
        minimumWidth={180}
        sidebar={createSidebar()}
      />,
    );
    const handle = container.querySelector<HTMLElement>("[data-sidebar-resize-handle]")!;
    fireEvent.pointerDown(handle, { button: 0, clientX: 240, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 500 });
    fireEvent.pointerMove(document, { clientX: 0 });
    fireEvent.pointerUp(document);

    expect(execute).toHaveBeenNthCalledWith(1, {
      type: "file-explorer.sidebar.width.set",
      width: 320,
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      type: "file-explorer.sidebar.width.set",
      width: 180,
    });
    expect(handle.tabIndex).toBe(-1);
    expect(handle.getAttribute("role")).toBeNull();
  });
});
