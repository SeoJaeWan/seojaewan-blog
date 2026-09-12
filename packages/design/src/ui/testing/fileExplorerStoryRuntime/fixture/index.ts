import {
  type FileExplorerNavigationValue,
  type FileExplorerTab,
  parseFileExplorerTabId,
} from "../../../../headless/folders/index.js";
import {
  type Content,
  createResourceRef,
  type FolderResourceRef,
} from "../../../../headless/resources/index.js";
import { parseWindowSessionId } from "../../../../headless/windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../../../headless/workspace/index.js";
import type { FileExplorerStoryScenario } from "../../fileExplorerStoryRuntime.js";

export const fileExplorerStorySessionId = parseWindowSessionId(
  "71000000-0000-4000-8000-000000000001",
);

export const fileExplorerStoryFolderRefs = Object.freeze([
  createResourceRef("folder", "72000000-0000-4000-8000-000000000001"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000002"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000003"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000004"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000005"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000006"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000007"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000008"),
]);
const [projects, year, frontend, blog, archive, design, notes, references] =
  fileExplorerStoryFolderRefs as readonly [
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
    FolderResourceRef,
  ];
const contentRef = createResourceRef("content", "73000000-0000-4000-8000-000000000001");

export const fileExplorerStoryWorkspace: WorkspaceState = Object.freeze({
  schemaVersion: 1,
  contentInbox: blog,
  folders: Object.freeze([
    Object.freeze({ ref: projects, name: "Projects" }),
    Object.freeze({ ref: year, name: "2026" }),
    Object.freeze({ ref: frontend, name: "Frontend" }),
    Object.freeze({ ref: blog, name: "Seojaewan Blog" }),
    Object.freeze({ ref: archive, name: "Archive" }),
    Object.freeze({ ref: design, name: "Design System" }),
    Object.freeze({ ref: notes, name: "Notes" }),
    Object.freeze({ ref: references, name: "References" }),
  ]),
  placements: Object.freeze([
    Object.freeze({ resource: projects, parent: null }),
    Object.freeze({ resource: archive, parent: null }),
    Object.freeze({ resource: design, parent: null }),
    Object.freeze({ resource: notes, parent: null }),
    Object.freeze({ resource: references, parent: null }),
    Object.freeze({ resource: year, parent: projects }),
    Object.freeze({ resource: frontend, parent: year }),
    Object.freeze({ resource: blog, parent: frontend }),
    Object.freeze({ resource: contentRef, parent: blog }),
  ]),
});

export const fileExplorerStoryContent: Content = Object.freeze({
  ref: contentRef,
  title: "File Explorer controller composition",
  slug: "file-explorer-controller-composition",
  summary: "",
  date: "2026-09-10",
  tags: Object.freeze([]),
  cover: null,
  source: Object.freeze({ kind: "notion", pageId: "story-page" }),
});

/**
 * Story scenario와 위치로 immutable File Explorer tab fixture를 만든다.
 */
export const createFileExplorerStoryTab = (
  index: number,
  location: FileExplorerNavigationValue,
  scenario: FileExplorerStoryScenario,
): FileExplorerTab =>
  Object.freeze({
    id: parseFileExplorerTabId(`74000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
    navigation: Object.freeze({
      current: Object.freeze({ location, scrollTop: 0 }),
      backStack: Object.freeze([]),
      forwardStack: Object.freeze([]),
    }),
    query: index === 0 ? (scenario.query ?? "") : "",
    expandedFolderIds:
      index === 0 && scenario.expanded
        ? Object.freeze([projects.id, year.id, frontend.id])
        : Object.freeze([]),
    selection: index === 0 && scenario.selected ? Object.freeze([contentRef]) : Object.freeze([]),
  });
