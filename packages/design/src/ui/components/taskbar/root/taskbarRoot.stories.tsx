import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  HeadlessRuntime,
  HeadlessRuntimeAdapters,
  TaskbarApplicationId,
  TaskbarTimestampClock,
  TaskbarTimestampTimer,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import {
  createHeadlessRuntime,
  HeadlessRuntimeProvider,
  usePrimaryPanelController,
} from "../../../../headless/index.js";
import { TaskbarPreview, withTaskbarDescription } from "../taskbarStoryPreview.js";
import { TaskbarRoot } from "./index.js";

const STORY_TIMESTAMP_CLOCK: TaskbarTimestampClock = Object.freeze({
  /** plan의 Asia/Seoul 고정 wall-clock과 같은 local Date를 반환한다. */
  now: () => new Date(2026, 6, 10, 15, 24, 0, 0),
  /** visual fixture의 clock을 진행시키지 않고 timer identity만 충족한다. */
  setTimeout: () => 0 as unknown as TaskbarTimestampTimer,
  /** visual fixture에는 취소할 실제 timer가 없다. */
  clearTimeout: () => undefined,
});

/** Story가 지정한 공통 mode와 기존 mobile Window Action을 제공하는 runtime을 만든다. */
const createStoryRuntime = (
  mode?: WindowMode,
  activeApplication?: TaskbarApplicationId,
  onMobileApplication: (applicationId: TaskbarApplicationId) => void = () => undefined,
): HeadlessRuntime => {
  if (mode === undefined) return createHeadlessRuntime();

  const snapshot = Object.freeze({
    mode,
    workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
    sessions:
      activeApplication === undefined
        ? Object.freeze([])
        : Object.freeze([
            Object.freeze({
              applicationId: activeApplication,
            }) as WindowState["sessions"][number],
          ]),
    stackingOrder: Object.freeze([]),
    activeSessionId: null,
  }) satisfies WindowState;
  const windows = {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    launchMobileApplication: (applicationId: TaskbarApplicationId) => {
      onMobileApplication(applicationId);
      return Promise.resolve({
        ok: true,
        changed: false,
        reason: "no-op",
        value: snapshot,
      }) as never;
    },
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;

  return createHeadlessRuntime({ adapters: { windows } });
};

/** Root와 같은 runtime의 observable primary panel state를 Story 아래에 표시한다. */
const PrimaryPanelProbe = () => {
  const { viewModel } = usePrimaryPanelController();
  const snapshot = viewModel.snapshot;

  return (
    <>
      <p>
        활성 패널: <output aria-label="활성 패널">{snapshot?.activePanel ?? "없음"}</output>
      </p>
      <p>
        시작 메뉴 검색어:{" "}
        <output aria-label="시작 메뉴 검색어">{snapshot?.startQuery || "(비어 있음)"}</output>
      </p>
      <p>
        검색 패널 검색어:{" "}
        <output aria-label="검색 패널 검색어">{snapshot?.searchQuery || "(비어 있음)"}</output>
      </p>
    </>
  );
};

/** production Root를 실제 provider 안에서 렌더링한다. */
const RootStory = ({
  mode,
  activeApplication,
  searchDisabled = false,
  windowsDisabled = false,
}: {
  mode?: WindowMode;
  activeApplication?: TaskbarApplicationId;
  searchDisabled?: boolean;
  windowsDisabled?: boolean;
}) => {
  const [mobileActionCount, setMobileActionCount] = useState(0);
  const [lastMobileApplication, setLastMobileApplication] = useState("없음");
  const runtime = useMemo(
    () =>
      createStoryRuntime(mode, activeApplication, (applicationId) => {
        setMobileActionCount((current) => current + 1);
        setLastMobileApplication(applicationId);
      }),
    [activeApplication, mode],
  );

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <TaskbarPreview
        viewport
        results={
          <>
            <PrimaryPanelProbe />
            <p>
              앱 요청: <output aria-label="앱 요청 횟수">{mobileActionCount}</output>
            </p>
            <p>
              마지막 앱: <output aria-label="마지막 선택한 앱">{lastMobileApplication}</output>
            </p>
            <button type="button">패널 밖</button>
          </>
        }
      >
        <TaskbarRoot
          searchDisabled={searchDisabled}
          timestampClock={STORY_TIMESTAMP_CLOCK}
          windowsDisabled={windowsDisabled}
        />
      </TaskbarPreview>
    </HeadlessRuntimeProvider>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Root",
  component: TaskbarRoot,
  tags: ["autodocs"],
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "화면 아래에 표시되는 작업 표시줄입니다. 데스크톱에서는 시작 버튼과 검색창 및 각 패널을, 모바일에서는 파일 탐색기와 Chrome 버튼을 보여 줍니다. 오른쪽에는 현재 시간과 날짜가 표시됩니다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  name: "데스크톱",
  parameters: {
    taskbarDescription:
      "시작 버튼과 검색창을 직접 눌러 각 패널을 열고 전환할 수 있습니다. 검색어 입력과 Escape 닫기, 패널 바깥을 눌러 닫는 동작도 확인할 수 있습니다. 패널의 실제 목록과 검색 결과는 후속 작업에서 연결합니다.",
  },
  render: () => <RootStory mode="desktop" />,
};

export const WindowsDisabled: Story = {
  name: "시작 버튼 · 사용 불가",
  parameters: {
    taskbarDescription:
      "시작 버튼만 사용할 수 없는 상태입니다. 검색창은 독립적으로 입력할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" windowsDisabled />,
};

export const SearchDisabled: Story = {
  name: "검색창 · 사용 불가",
  parameters: {
    taskbarDescription: "검색창만 입력할 수 없는 상태입니다. 시작 버튼은 사용할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" searchDisabled />,
};

export const Mobile: Story = {
  name: "모바일",
  parameters: {
    taskbarDescription:
      "파일 탐색기 → Chrome → 시간 순서입니다. 각 버튼을 직접 눌러 아래 요청 횟수와 마지막 대상을 확인할 수 있습니다. 실제 창 본문은 후속 제품에서 연결합니다.",
  },
  render: () => <RootStory mode="mobile" />,
};

export const MobileChromeActive: Story = {
  name: "모바일 · Chrome 활성 상태",
  parameters: {
    taskbarDescription:
      "Chrome이 현재 활성 앱인 모습을 보여 줍니다. 버튼을 다시 눌러도 입력 요청이 전달되며, 이 예제에서는 실제 창을 열지 않습니다.",
  },
  render: () => <RootStory activeApplication="chrome" mode="mobile" />,
};

export const NotReady: Story = {
  name: "준비 중",
  parameters: {
    taskbarDescription: "화면 구성이 준비되기 전에는 작업 표시줄의 배경만 표시합니다.",
  },
  render: () => <RootStory />,
};
