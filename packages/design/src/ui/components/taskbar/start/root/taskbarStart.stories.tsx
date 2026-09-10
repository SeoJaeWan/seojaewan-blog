import type { ReactNode } from "react";
import { useMemo } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import type { HeadlessRuntimeAdapters, WindowState } from "../../../../../headless/index.js";
import { createHeadlessRuntime, HeadlessRuntimeProvider } from "../../../../../headless/index.js";
import {
  type TaskbarPanelsConnection,
  useTaskbarPanelsConnection,
} from "../../panels/connection/index.js";
import { withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarStart } from "./index.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

/** Story용 desktop Window input과 실제 primary panel runtime을 조합한다. */
const createStartRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({ adapters: { windows } });
};

/** 실제 Start connection의 query와 open 상태를 Canvas에서 관찰한다. */
const ConnectedStart = () => {
  const panels = useTaskbarPanelsConnection();
  return (
    <StartStoryLayout panels={panels}>
      <TaskbarStart connection={panels.start} />
    </StartStoryLayout>
  );
};

/** 제품 part와 외부 focus 대상, 관찰 결과를 분리해 배치한다. */
const StartStoryLayout = ({
  children,
  panels,
}: {
  children: ReactNode;
  panels: TaskbarPanelsConnection;
}) => (
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
    <nav
      aria-label="작업 표시줄"
      style={{
        alignItems: "center",
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
      {children}
    </nav>
    <div style={{ position: "fixed", right: 16, top: 16 }}>
      <p>
        Start 상태:{" "}
        <output aria-label="Start panel 상태">{panels.start.widget.open ? "열림" : "닫힘"}</output>
      </p>
      <p>
        Start 검색어:{" "}
        <output aria-label="Start 검색어">{panels.start.query || "(비어 있음)"}</output>
      </p>
    </div>
  </div>
);

/** production Provider와 Start 제품 part를 한 runtime에서 렌더링한다. */
const StartStory = () => {
  const runtime = useMemo(createStartRuntime, []);
  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <ConnectedStart />
    </HeadlessRuntimeProvider>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start",
  component: TaskbarStart,
  tags: ["autodocs"],
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Taskbar 시작 버튼과 Start panel, 별도 상단 검색 input을 실제 primary panel 상태에 연결하는 제품 part다. 버튼 toggle, selected·ARIA, input query와 close 완료 초기화를 함께 제공한다. 고정 목록·모두 보기·Index 본문은 후속 Start 기능이 연결한다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
  args: {
    connection: {} as TaskbarPanelsConnection["start"],
  },
} satisfies Meta<typeof TaskbarStart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 열어 보기",
  parameters: {
    taskbarDescription:
      "시작 버튼을 눌러 panel을 열고 상단 검색창에 한글과 공백을 입력해 보세요. 패널 밖을 누르거나 Escape로 닫은 뒤 검색어가 비워지는지 확인할 수 있습니다.",
  },
  render: () => <StartStory />,
};
