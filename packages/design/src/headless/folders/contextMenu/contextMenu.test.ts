import { describe, expect, it } from "vitest";

import { createResourceRef } from "../../resources/index.js";
import type { StartSnapshot } from "../../start/index.js";
import { parseWindowSessionId } from "../../windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import { parseFileExplorerTabId } from "../fileExplorerTabId/index.js";
import { selectFileExplorerSidebarContextMenu } from "./index.js";

const sessionId = parseWindowSessionId("10000000-0000-4000-8000-000000000001");
const tabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000001");
const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const workspace: WorkspaceState = Object.freeze({
  schemaVersion: 1,
  contentInbox: folder,
  folders: Object.freeze([Object.freeze({ ref: folder, name: "Blog" })]),
  placements: Object.freeze([Object.freeze({ resource: folder, parent: null })]),
});

describe("selectFileExplorerSidebarContextMenu", () => {
  it("Desktop target에는 create와 새 Window Action만 정확한 순서로 제공한다", () => {
    const menu = selectFileExplorerSidebarContextMenu(
      workspace,
      { pinnedItems: [] },
      sessionId,
      tabId,
      null,
    );

    expect(menu.target).toEqual({
      surface: "file-explorer",
      sessionId,
      tabId,
      location: null,
    });
    expect(menu.capability).toEqual({
      open: false,
      openInNewWindow: true,
      createFolder: true,
      rename: false,
      pinToStart: false,
    });
    expect(menu.entries.map(({ id, action }) => [id, action])).toEqual([
      [
        "create-folder",
        {
          type: "file-explorer.folder.create.begin",
          parent: null,
          suggestedName: "새 폴더",
        },
      ],
      ["open-in-new-window", { type: "file-explorer.window.open", location: null }],
    ]);
  });

  it("Folder target에는 invocation ref 기반 open·create·rename·Start pin Action을 제공한다", () => {
    const menu = selectFileExplorerSidebarContextMenu(
      workspace,
      { pinnedItems: [] },
      sessionId,
      tabId,
      folder,
    );

    expect(menu.target).toEqual({
      surface: "file-explorer",
      sessionId,
      tabId,
      location: folder,
      resource: folder,
    });
    expect(menu.entries.map(({ action }) => action)).toEqual([
      { type: "file-explorer.navigation.navigate", location: folder },
      { type: "file-explorer.window.open", location: folder },
      {
        type: "file-explorer.folder.create.begin",
        parent: folder,
        suggestedName: "새 폴더",
      },
      {
        type: "file-explorer.folder.rename.begin",
        folder,
        currentName: "Blog",
      },
      { type: "file-explorer.start.pin", resource: folder },
    ]);
  });

  it("이미 고정된 Folder에는 Start unpin intent를 만들어 Pin 상태를 복제하지 않는다", () => {
    const start: StartSnapshot = Object.freeze({
      pinnedItems: Object.freeze([Object.freeze({ resource: folder })]),
    });
    const menu = selectFileExplorerSidebarContextMenu(workspace, start, sessionId, tabId, folder);

    expect(menu.entries.at(-1)).toEqual({
      kind: "action",
      id: "unpin-from-start",
      label: "시작 화면에서 제거",
      action: { type: "file-explorer.start.unpin", resource: folder },
    });
  });
});
