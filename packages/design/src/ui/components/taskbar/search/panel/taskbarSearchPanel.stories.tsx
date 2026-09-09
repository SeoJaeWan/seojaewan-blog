import { useMemo } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type WindowState,
} from "../../../../../headless/index.js";
import {
  type TaskbarPanelsConnection,
  useTaskbarPanelsConnection,
} from "../../panels/connection/index.js";
import { withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarSearchPanel } from "./index.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

/** Story마다 독립된 desktop primary panel runtime을 만든다. */
const createSearchRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;

  return createHeadlessRuntime({ adapters: { windows } });
};

/** 실제 connection과 Search input·panel을 조합해 lifecycle 결과를 보여준다. */
const ConnectedSearchExample = () => {
  const connection = useTaskbarPanelsConnection();

  return (
    <div
      lang="ko-KR"
      style={{
        background: "linear-gradient(135deg, #c9def4, #eef4f8)",
        minHeight: "100vh",
      }}
    >
      <button style={{ left: 16, position: "fixed", top: 16 }} type="button">
        패널 밖
      </button>
      <div
        aria-label="Search 연결 상태"
        role="status"
        style={{ position: "fixed", right: 16, top: 16 }}
      >
        <span>Panel: {connection.search.widget.open ? "열림" : "닫힘"}; </span>
        <span>
          입력값:{" "}
          <output aria-label="연결된 검색어">{connection.search.query || "(비어 있음)"}</output>
        </span>
      </div>
      <nav
        aria-label="작업 표시줄"
        style={{
          alignItems: "center",
          backdropFilter: "blur(18px)",
          background: "rgb(255 255 255 / 80%)",
          bottom: 0,
          display: "flex",
          height: 50,
          justifyContent: "center",
          left: 0,
          position: "fixed",
          right: 0,
          zIndex: 2147483647,
        }}
      >
        <TaskbarSearchPanel connection={connection.search}>
          <p>검색 결과·recent·detail은 HDJG-46·47의 제품 view가 제공합니다.</p>
        </TaskbarSearchPanel>
      </nav>
    </div>
  );
};

/** 독립 runtime을 Provider에 한 번 고정해 실제 제품 연결 Story를 렌더링한다. */
const ConnectedSearchStory = () => {
  const runtime = useMemo(() => createSearchRuntime(), []);

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <ConnectedSearchExample />
    </HeadlessRuntimeProvider>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Search",
  component: TaskbarSearchPanel,
  tags: ["autodocs"],
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "작업 표시줄의 검색 입력창과 Search panel을 하나의 제품 흐름으로 연결합니다. 입력·재클릭·Escape·외부 닫기를 직접 확인할 수 있으며 검색 결과·추천·recent·detail 본문은 후속 기능에서 연결합니다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
  args: {
    connection: {} as TaskbarPanelsConnection["search"],
    children: null,
  },
} satisfies Meta<typeof TaskbarSearchPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 검색해 보기",
  parameters: {
    taskbarDescription:
      "검색창에 한글과 공백을 입력하고 다시 클릭해 보세요. Escape를 누르면 포커스가 사라지고, 패널이 닫힌 뒤 입력값이 비워지는 것을 확인할 수 있습니다.",
  },
  render: () => <ConnectedSearchStory />,
};
