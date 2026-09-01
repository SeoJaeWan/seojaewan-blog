import { describe, expect, it } from "vitest";

import * as packageApi from "../../index";
import * as uiApi from "../index";
import * as componentApi from "./index";

const publicRoles = [
  "FolderCategoryItemUI",
  "FolderFileCardUI",
  "FolderFileGridUI",
  "FolderFrameUI",
  "FolderSidebarUI",
  "FolderViewerUI",
  "RouteInputUI",
  "TagInputUI",
  "TaskbarAppListUI",
  "TaskbarClockUI",
  "TaskbarItemUI",
  "TaskbarPreviewUI",
  "TaskbarRootUI",
  "TaskbarSearchUI",
  "TaskbarStartButtonUI",
  "WindowControlsUI",
  "WindowFrameUI",
  "WindowPanelUI",
  "WindowRouteBarUI",
  "WindowTabUI",
  "WindowTitleBarUI",
] as const;

describe("HDJG-26 component public contract", () => {
  it.each([
    ["component family aggregate", componentApi],
    ["global UI entry", uiApi],
    ["package entry", packageApi],
  ])("makes all 21 roles available from the %s", (_, api) => {
    for (const role of publicRoles) {
      expect(api[role]).toBeTypeOf("function");
    }
  });

  it.each([
    ["component family aggregate", componentApi],
    ["global UI entry", uiApi],
    ["package entry", packageApi],
  ])("keeps WindowResizeHandlesUI private in the %s", (_, api) => {
    expect(api).not.toHaveProperty("WindowResizeHandlesUI");
  });
});
