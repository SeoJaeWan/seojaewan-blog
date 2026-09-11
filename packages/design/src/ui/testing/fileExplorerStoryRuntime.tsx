/**
 * @file File Explorer Story가 실제 Provider/controller를 통과하도록 runtime fixture를 조합한다.
 */
import { useEffect, useRef } from "react";

import type {
  FileExplorerNavigationValue,
  FolderViewMode,
  FolderViewSettingsSnapshot,
} from "../../headless/folders/index.js";
import { createStaticCatalog } from "../../headless/resources/index.js";
import type { HeadlessRuntime } from "../../headless/runtime/index.js";
import type { StartSnapshot } from "../../headless/start/index.js";
import type { FileExplorerWindowSession, WindowState } from "../../headless/windows/index.js";
import {
  createFileExplorerStoryTab,
  fileExplorerStoryContent,
  fileExplorerStoryFolderRefs,
  fileExplorerStorySessionId,
  fileExplorerStoryWorkspace,
} from "./fileExplorerStoryRuntime/fixture/index.js";
import {
  createFileExplorerStoryActionRecorder,
  createFileExplorerStoryChannel,
  type FileExplorerStoryActionRecorder,
} from "./fileExplorerStoryRuntime/runtimeChannel/index.js";
import { reduceFileExplorerViewSettingsStory } from "./fileExplorerStoryRuntime/viewSettingsStoryReducer/index.js";
import { createFileExplorerWindowStoryReducer } from "./fileExplorerStoryRuntime/windowStoryReducer/index.js";

export type FileExplorerStoryScenario = Readonly<{
  mode?: WindowState["mode"];
  overflowTabs?: boolean;
  query?: string;
  unresolved?: boolean;
  expanded?: boolean;
  viewMode?: FolderViewMode;
  selected?: boolean;
}>;

/**
 * Story scenario별 실제 controller 입력과 Action 관찰 store를 만든다.
 */
export const createFileExplorerStoryRuntime = (scenario: FileExplorerStoryScenario = {}) => {
  const recorder = createFileExplorerStoryActionRecorder();
  const reduceWindows = createFileExplorerWindowStoryReducer();
  const mode = scenario.mode ?? "desktop";
  const blog = fileExplorerStoryFolderRefs[3];
  const archive = fileExplorerStoryFolderRefs[4];
  const firstLocation: FileExplorerNavigationValue = scenario.unresolved
    ? (Object.freeze({
        kind: "unresolved-path",
        path: "/Missing/Archive",
      }) as FileExplorerNavigationValue)
    : blog;
  const locations: readonly FileExplorerNavigationValue[] = scenario.overflowTabs
    ? fileExplorerStoryFolderRefs
    : Object.freeze([firstLocation, archive]);
  const tabs = Object.freeze(
    locations.map((location, index) =>
      createFileExplorerStoryTab(index, index === 0 ? firstLocation : location, scenario),
    ),
  );
  const explorerSession: FileExplorerWindowSession = Object.freeze({
    kind: "file-explorer",
    applicationId: "file-explorer",
    id: fileExplorerStorySessionId,
    frame: Object.freeze({
      normalBounds: Object.freeze({
        x: scenario.overflowTabs ? 30 : 60,
        y: 34,
        width: scenario.overflowTabs ? 580 : 920,
        height: 600,
      }),
      placement: "normal",
      minimized: false,
    }),
    tabs,
    activeTabId: tabs[0].id,
    sidebarWidth: 240,
  });
  const windows: WindowState = Object.freeze({
    mode,
    workArea: Object.freeze(
      mode === "mobile"
        ? { x: 0, y: 0, width: 390, height: 760 }
        : { x: 0, y: 0, width: 1080, height: 680 },
    ),
    sessions: Object.freeze([explorerSession]),
    stackingOrder: Object.freeze([fileExplorerStorySessionId]),
    activeSessionId: fileExplorerStorySessionId,
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
    windows: createFileExplorerStoryChannel(windows, "windows", recorder, reduceWindows),
    workspace: createFileExplorerStoryChannel(fileExplorerStoryWorkspace, "workspace", recorder),
    start: createFileExplorerStoryChannel(start, "start", recorder),
    folderViewSettings: createFileExplorerStoryChannel(
      settings,
      "folderViewSettings",
      recorder,
      reduceFileExplorerViewSettingsStory,
    ),
    fileExplorerResources: Object.freeze({
      content: createStaticCatalog([fileExplorerStoryContent]),
      externalShortcut: createStaticCatalog([]),
    }),
    windowGestures: Object.freeze({ begin: () => ({ ok: false, reason: "not-supported" }) }),
  }) as unknown as HeadlessRuntime;

  return Object.freeze({ runtime, recorder, sessionId: fileExplorerStorySessionId });
};

/**
 * Story play function이 제품 UI가 보낸 exact owner Action 목록을 읽는 출력이다.
 */
export const FileExplorerStoryActionLog = ({
  recorder,
}: {
  recorder: FileExplorerStoryActionRecorder;
}) => {
  const outputRef = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const output = outputRef.current;
    return output === null ? undefined : recorder.connect(output);
  }, [recorder]);
  return <output aria-label="File Explorer Action 기록" data-story-actions="" ref={outputRef} />;
};
