import { describe, expect, it } from "vitest";

import { createResourceRef, type FolderResourceRef } from "../../resources/index.js";
import type { WorkspaceState } from "../model/index.js";
import {
  resolveWorkspacePath,
  selectWorkspaceBreadcrumb,
  selectWorkspacePath,
  selectWorkspaceSidebarTree,
  suggestWorkspaceFolderName,
} from "./index.js";

const folder = (suffix: string): FolderResourceRef =>
  createResourceRef("folder", `10000000-0000-4000-8000-${suffix}`);
const blog = folder("000000000001");
const react = folder("000000000002");
const archive = folder("000000000003");
const korean = folder("000000000004");

const state: WorkspaceState = {
  schemaVersion: 1,
  contentInbox: blog,
  folders: [
    { ref: blog, name: "Blog" },
    { ref: react, name: "React" },
    { ref: archive, name: "archive" },
    { ref: korean, name: "새 폴더" },
  ],
  placements: [
    { resource: blog, parent: null },
    { resource: react, parent: blog },
    { resource: archive, parent: null },
    { resource: korean, parent: blog },
  ],
};

describe("Workspace path selectors", () => {
  it("root, case-insensitive segment와 trailing slash를 해석한다", () => {
    expect(resolveWorkspacePath(state, "/")).toEqual({ type: "location", location: null });
    expect(resolveWorkspacePath(state, "/blog/rEaCt/")).toEqual({
      type: "location",
      location: react,
    });
    expect(selectWorkspacePath(state, react)).toBe("/Blog/React");
  });

  it.each(["Blog", "/missing", "/Blog//React"])(
    "해석할 수 없는 절대 경로 입력 %j을 그대로 보존한다",
    (path) => {
      expect(resolveWorkspacePath(state, path)).toEqual({ type: "unresolved-path", path });
    },
  );

  it("NFC와 case-insensitive 이름 key로 경로를 해석한다", () => {
    const cafe = folder("000000000005");
    const composed: WorkspaceState = {
      ...state,
      folders: [...state.folders, { ref: cafe, name: "Caf\u00e9" }],
      placements: [...state.placements, { resource: cafe, parent: null }],
    };
    expect(resolveWorkspacePath(composed, "/CAFE\u0301")).toEqual({
      type: "location",
      location: cafe,
    });
  });
});

describe("Workspace breadcrumb and Sidebar tree selectors", () => {
  it("Desktop부터 현재 Folder까지 저장 casing과 누적 path를 반환한다", () => {
    expect(selectWorkspaceBreadcrumb(state, react)).toEqual([
      { location: null, name: "Desktop", path: "/" },
      { location: blog, name: "Blog", path: "/Blog" },
      { location: react, name: "React", path: "/Blog/React" },
    ]);
  });

  it("Folder만 nested tree로 만들고 sibling을 case-insensitive 정렬한다", () => {
    expect(selectWorkspaceSidebarTree(state)).toEqual([
      { ref: archive, name: "archive", path: "/archive", children: [] },
      {
        ref: blog,
        name: "Blog",
        path: "/Blog",
        children: [
          { ref: react, name: "React", path: "/Blog/React", children: [] },
          { ref: korean, name: "새 폴더", path: "/Blog/새 폴더", children: [] },
        ],
      },
    ]);
  });
});

describe("Workspace new Folder name selector", () => {
  it("parent별로 최소 빈 suffix를 제안한다", () => {
    const two = folder("000000000006");
    const four = folder("000000000007");
    const withSuffixes: WorkspaceState = {
      ...state,
      folders: [
        ...state.folders,
        { ref: two, name: "새 폴더 (2)" },
        { ref: four, name: "새 폴더 (4)" },
      ],
      placements: [
        ...state.placements,
        { resource: two, parent: blog },
        { resource: four, parent: blog },
      ],
    };
    expect(suggestWorkspaceFolderName(withSuffixes, blog)).toBe("새 폴더 (3)");
    expect(suggestWorkspaceFolderName(withSuffixes, null)).toBe("새 폴더");
  });
});
