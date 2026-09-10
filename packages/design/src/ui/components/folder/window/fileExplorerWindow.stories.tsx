import { useMemo } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { HeadlessRuntimeProvider } from "../../../../headless/runtime/index.js";
import {
  createFileExplorerStoryRuntime,
  FileExplorerStoryActionLog,
  type FileExplorerStoryScenario,
} from "../../../testing/fileExplorerStoryRuntime.js";
import { FileExplorerWindow } from "./index.js";

import "./fileExplorerWindow.stories.css";

const PLACEMENT_CONFIG = Object.freeze({
  defaultSize: Object.freeze({ width: 920, height: 600 }),
  minSize: Object.freeze({ width: 320, height: 240 }),
  edgeMargin: 8,
  cascadeOffset: Object.freeze({ x: 24, y: 24 }),
  titlebarRecoverySize: Object.freeze({ width: 120, height: 30 }),
});
const META_FIXTURE = createFileExplorerStoryRuntime();

/** 한 scenario를 actual Provider/controller/Product Component 경로로 표시한다. */
const FileExplorerStory = ({ scenario }: { scenario: FileExplorerStoryScenario }) => {
  const fixture = useMemo(() => createFileExplorerStoryRuntime(scenario), [scenario]);
  const mode = scenario.mode ?? "desktop";
  return (
    <div className="file-explorer-story">
      <div className="file-explorer-story__stage" data-mode={mode}>
        <HeadlessRuntimeProvider runtime={fixture.runtime}>
          <FileExplorerWindow
            aria-label="File Explorer 제품 창"
            placementConfig={PLACEMENT_CONFIG}
            sessionId={fixture.sessionId}
          />
        </HeadlessRuntimeProvider>
        <FileExplorerStoryActionLog recorder={fixture.recorder} />
      </div>
    </div>
  );
};

const meta = {
  title: "Products/File Explorer/Window",
  component: FileExplorerWindow,
  args: {
    placementConfig: PLACEMENT_CONFIG,
    sessionId: META_FIXTURE.sessionId,
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "WindowRoot와 실제 File Explorer controller/provider를 조합한 제품 Story입니다. legacy reference와 같은 1080×680 desktop·390×760 mobile viewport에서 frame, chrome, Sidebar, address, status와 상태를 비교합니다. 현재 계약은 legacy command bar와 상위 폴더 control을 제외하며, Resource item DOM·선택 gesture·Content Context Menu는 #34 범위이므로 이 Story에서도 가짜 item markup으로 대체하지 않습니다.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FileExplorerWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  name: "Desktop 제품 조합",
  render: () => <FileExplorerStory scenario={Object.freeze({ selected: true })} />,
};

export const Mobile: Story = {
  name: "Mobile 제품 조합",
  parameters: {
    docs: {
      description: {
        story:
          "Mobile은 Sidebar, status, multi-tab과 frame move/resize/maximize를 DOM에서 제거하고 address와 full-width search를 유지합니다.",
      },
    },
  },
  render: () => <FileExplorerStory scenario={Object.freeze({ mode: "mobile" })} />,
};

export const OverflowTabs: Story = {
  name: "Tab overflow",
  render: () => <FileExplorerStory scenario={Object.freeze({ overflowTabs: true })} />,
};

export const LongBreadcrumb: Story = {
  name: "긴 breadcrumb 축약",
  render: () => <FileExplorerStory scenario={Object.freeze({ expanded: true })} />,
};

export const UnresolvedAddress: Story = {
  name: "해결할 수 없는 주소",
  render: () => <FileExplorerStory scenario={Object.freeze({ unresolved: true })} />,
};

export const SearchEmpty: Story = {
  name: "검색 결과 없음",
  render: () => <FileExplorerStory scenario={Object.freeze({ query: "no-match" })} />,
};

export const SidebarExpanded: Story = {
  name: "Sidebar 펼침",
  render: () => <FileExplorerStory scenario={Object.freeze({ expanded: true })} />,
};

export const SidebarContextAndInlineEdit: Story = {
  name: "Sidebar Context Menu와 inline edit",
  render: () => <FileExplorerStory scenario={Object.freeze({ expanded: true })} />,
};

export const DetailsView: Story = {
  name: "자세히 보기 상태",
  render: () => <FileExplorerStory scenario={Object.freeze({ viewMode: "details" })} />,
};
