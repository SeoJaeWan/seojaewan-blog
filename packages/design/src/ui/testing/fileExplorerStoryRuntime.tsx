/**
 * @file File Explorer Story가 실제 Provider/controller를 통과하도록 immutable runtime fixture를 만든다.
 */
import { useEffect, useRef } from "react";

import type {
  FileExplorerNavigationValue,
  FileExplorerTab,
  FolderViewMode,
  FolderViewSettingsSnapshot,
} from "../../headless/folders/index.js";
import {
  parseFileExplorerTabId,
} from "../../headless/folders/index.js";
import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type FolderResourceRef,
} from "../../headless/resources/index.js";
import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
} from "../../headless/runtime/index.js";
import type { StartSnapshot } from "../../headless/start/index.js";
import type { WindowState } from "../../headless/windows/index.js";
import { parseWindowSessionId } from "../../headless/windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../headless/workspace/index.js";

export type FileExplorerStoryScenario = Readonly<{
  mode?: WindowState["mode"];
  overflowTabs?: boolean;
  query?: string;
  unresolved?: boolean;
  expanded?: boolean;
  viewMode?: FolderViewMode;
  selected?: boolean;
}>;

type RecordedAction = Readonly<{ owner: string; action: Readonly<{ type?: unknown }> }>;

/** Story browser assertion이 controller가 전달한 owner Action을 관찰하는 작은 외부 store다. */
const createActionRecorder = () => {
  let actions: readonly RecordedAction[] = Object.freeze([]);
  const outputs = new Set<HTMLOutputElement>();
  const value = () => JSON.stringify(actions);
  return Object.freeze({
    record(owner: string, action: unknown) {
      actions = Object.freeze([
        ...actions,
        Object.freeze({ owner, action: action as Readonly<{ type?: unknown }> }),
      ]);
      for (const output of outputs) output.textContent = value();
    },
    connect(output: HTMLOutputElement) {
      outputs.add(output);
      output.textContent = value();
      return () => {
        outputs.delete(output);
      };
    },
  });
};

const operationHandle = Object.freeze({
  operationId: "file-explorer-story-operation",
  committed: Promise.resolve(Object.freeze({ status: "no-op" })),
  presented: Promise.resolve(Object.freeze({ status: "not-required" })),
  settled: Promise.resolve(Object.freeze({ status: "settled" })),
});

const createChannel = <Snapshot,>(
  snapshot: Snapshot,
  owner: string,
  recorder: ReturnType<typeof createActionRecorder>,
) => {
  const ready: ControllerViewModel<Snapshot> = Object.freeze({ status: "ready", snapshot });
  return Object.freeze({
    getSnapshot: () => ready,
    getServerSnapshot: () => ready,
    subscribe: () => () => undefined,
    execute: (action: unknown) => {
      recorder.record(owner, action);
      return operationHandle;
    },
  }) as unknown as HeadlessFeatureRuntime<Snapshot, never, never>;
};

const sessionId = parseWindowSessionId("71000000-0000-4000-8000-000000000001");
const folderRefs = Object.freeze([
  createResourceRef("folder", "72000000-0000-4000-8000-000000000001"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000002"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000003"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000004"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000005"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000006"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000007"),
  createResourceRef("folder", "72000000-0000-4000-8000-000000000008"),
]);
const [projects, year, frontend, blog, archive, design, notes, references] = folderRefs as readonly [
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

const workspace: WorkspaceState = Object.freeze({
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

const content: Content = Object.freeze({
  ref: contentRef,
  title: "File Explorer controller composition",
  slug: "file-explorer-controller-composition",
  summary: "",
  date: "2026-09-10",
  tags: Object.freeze([]),
  cover: null,
  source: Object.freeze({ kind: "notion", pageId: "story-page" }),
});

const createTab = (
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
    selection:
      index === 0 && scenario.selected ? Object.freeze([contentRef]) : Object.freeze([]),
  });

/** Story scenario별 actual controller 입력과 action 관찰 store를 만든다. */
export const createFileExplorerStoryRuntime = (scenario: FileExplorerStoryScenario = {}) => {
  const recorder = createActionRecorder();
  const mode = scenario.mode ?? "desktop";
  const firstLocation: FileExplorerNavigationValue = scenario.unresolved
    ? (Object.freeze({
        kind: "unresolved-path",
        path: "/Missing/Archive",
      }) as FileExplorerNavigationValue)
    : blog;
  const locations: readonly FileExplorerNavigationValue[] = scenario.overflowTabs
    ? folderRefs
    : Object.freeze([firstLocation, archive]);
  const tabs = Object.freeze(
    locations.map((location, index) => createTab(index, index === 0 ? firstLocation : location, scenario)),
  );
  const windows: WindowState = Object.freeze({
    mode,
    workArea: Object.freeze(
      mode === "mobile"
        ? { x: 0, y: 0, width: 390, height: 760 }
        : { x: 0, y: 0, width: 1080, height: 680 },
    ),
    sessions: Object.freeze([
      Object.freeze({
        kind: "file-explorer" as const,
        applicationId: "file-explorer" as const,
        id: sessionId,
        frame: Object.freeze({
          normalBounds: Object.freeze({
            x: scenario.overflowTabs ? 30 : 60,
            y: 34,
            width: scenario.overflowTabs ? 580 : 920,
            height: 600,
          }),
          placement: "normal" as const,
          minimized: false,
        }),
        tabs,
        activeTabId: tabs[0].id,
        sidebarWidth: 240,
      }),
    ]),
    stackingOrder: Object.freeze([sessionId]),
    activeSessionId: sessionId,
  });
  const settings: FolderViewSettingsSnapshot = Object.freeze({
    surface: mode,
    entries:
      mode === "desktop" && scenario.viewMode !== undefined
        ? Object.freeze([
            Object.freeze({
              location: blog,
              settings: Object.freeze({
                viewMode: scenario.viewMode,
                sortKey: "name" as const,
                sortDirection: "ascending" as const,
                detailsColumnWidths: Object.freeze({ modified: 160, type: 120 }),
              }),
            }),
          ])
        : Object.freeze([]),
  });
  const start: StartSnapshot = Object.freeze({ pinnedItems: Object.freeze([]) });

  const runtime = Object.freeze({
    windows: createChannel(windows, "windows", recorder),
    workspace: createChannel(workspace, "workspace", recorder),
    start: createChannel(start, "start", recorder),
    folderViewSettings: createChannel(settings, "folderViewSettings", recorder),
    fileExplorerResources: Object.freeze({
      content: createStaticCatalog([content]),
      externalShortcut: createStaticCatalog([]),
    }),
    windowGestures: Object.freeze({ begin: () => ({ ok: false, reason: "not-supported" }) }),
  }) as unknown as HeadlessRuntime;

  return Object.freeze({ runtime, recorder, sessionId });
};

/** Story play function이 제품 UI가 보낸 exact owner Action 목록을 읽는 출력이다. */
export const FileExplorerStoryActionLog = ({
  recorder,
}: {
  recorder: ReturnType<typeof createActionRecorder>;
}) => {
  const outputRef = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const output = outputRef.current;
    return output === null ? undefined : recorder.connect(output);
  }, [recorder]);
  return (
    <output aria-label="File Explorer Action 기록" data-story-actions="" ref={outputRef} />
  );
};
