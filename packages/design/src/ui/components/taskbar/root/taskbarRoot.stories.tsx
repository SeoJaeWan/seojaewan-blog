import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  TaskbarPreview,
  withTaskbarDescription,
} from "../../../../../.storybook/taskbarPreview.js";
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
import { TaskbarRoot } from "./taskbarRoot.js";

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
        Start 검색어: <output aria-label="Start 검색어">{snapshot?.startQuery || "(비어 있음)"}</output>
      </p>
      <p>
        Search 검색어:{" "}
        <output aria-label="Search 검색어">{snapshot?.searchQuery || "(비어 있음)"}</output>
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
      createStoryRuntime(
        mode,
        activeApplication,
        (applicationId) => {
          setMobileActionCount((current) => current + 1);
          setLastMobileApplication(applicationId);
        },
      ),
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
              앱 요청: <output aria-label="Mobile Action 횟수">{mobileActionCount}</output>
            </p>
            <p>
              마지막 앱:{" "}
              <output aria-label="마지막 Mobile application">{lastMobileApplication}</output>
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

/** 실제 browser에서 Root 높이·viewport 폭·좁은 폭 overflow를 확인한다. */
const verifyRootGeometry = async (canvasElement: HTMLElement, mode: WindowMode) => {
  const taskbar = within(canvasElement).getByRole("navigation", { name: "작업 표시줄" });
  const bounds = taskbar.getBoundingClientRect();

  await expect(taskbar.getAttribute("data-mode")).toBe(mode);
  await expect(bounds.height).toBe(50);
  await expect(bounds.left).toBe(0);
  await expect(bounds.right).toBe(window.innerWidth);
  await expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);

  if (mode === "desktop") {
    const canvas = within(canvasElement);
    const windowsBounds = canvas.getByRole("button", { name: "시작" }).getBoundingClientRect();
    const searchBounds = canvas.getByRole("textbox", { name: "검색" }).getBoundingClientRect();
    await expect(windowsBounds.width).toBe(40);
    await expect(windowsBounds.height).toBe(40);
    await expect(searchBounds.width).toBe(220);
    await expect(searchBounds.height).toBe(30);
    await expect(searchBounds.left - windowsBounds.right).toBe(12);
    await expect(
      canvasElement.querySelector('[data-taskbar-region="desktop-applications"]'),
    ).not.toBeNull();
    await expect(canvas.queryByRole("button", { name: "파일 탐색기" })).toBeNull();
  } else {
    const canvas = within(canvasElement);
    const fileExplorer = canvas.getByRole("button", { name: "파일 탐색기" });
    const chrome = canvas.getByRole("button", { name: "Chrome" });
    const fileExplorerBounds = fileExplorer.getBoundingClientRect();
    const chromeBounds = chrome.getBoundingClientRect();
    await expect(fileExplorerBounds.width).toBe(40);
    await expect(fileExplorerBounds.height).toBe(40);
    await expect(chromeBounds.width).toBe(40);
    await expect(chromeBounds.height).toBe(40);
    await expect(chromeBounds.left - fileExplorerBounds.right).toBe(12);
    await expect(canvas.queryByRole("button", { name: "시작" })).toBeNull();
    await expect(canvas.queryByRole("textbox", { name: "검색" })).toBeNull();
  }

  const timestamp = within(canvasElement).getByText("15:24").parentElement;
  const timestampBounds = timestamp?.getBoundingClientRect();
  await expect(timestamp).not.toBeNull();
  await expect(timestampBounds?.height).toBeGreaterThan(0);
  await expect(timestampBounds?.height).toBeLessThanOrEqual(bounds.height);
  await expect(timestampBounds?.right).toBe(window.innerWidth - 24);
  await expect(within(canvasElement).getByText("2026-07-10")).toBeVisible();
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
          "공통 WindowState.mode를 소비하는 화면 하단 Taskbar 제품 Root다. " +
          "desktop Start·Search primary panel과 mobile File Explorer·Chrome Action, local Timestamp를 제공한다. " +
          "고정 목록·검색 결과·recent·detail과 실제 Window 본문은 후속 제품 view가 연결한다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  parameters: {
    taskbarDescription:
      "실제 Start/Search panel의 toggle·순차 전환, Taskbar input의 한글·공백 유지, Escape blur·초기화와 outside dismiss를 확인합니다. 고정 목록·검색 결과·recent·detail 본문은 후속 작업입니다.",
  },
  render: () => <RootStory mode="desktop" />,
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "desktop");
    const canvas = within(canvasElement);
    const page = within(document.body);
    const start = canvas.getByRole("button", { name: "시작" });
    const search = canvas.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    const activePanel = canvas.getByRole("status", { name: "활성 패널" });

    await userEvent.click(start);
    await waitFor(() => expect(activePanel).toHaveTextContent("start"));
    await waitFor(() => expect(page.getByRole("dialog", { name: "시작" })).toBeVisible());
    await expect(page.getByRole("textbox", { name: "앱 및 문서 검색" })).toBeVisible();

    await userEvent.click(search);
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
    await expect(page.queryByRole("dialog", { name: "검색" })).toBeNull();
    await waitFor(() => expect(activePanel).toHaveTextContent("search"));
    await waitFor(() => expect(page.getByRole("dialog", { name: "검색" })).toBeVisible());
    await userEvent.type(search, "한글  검색 ");
    await expect(search).toHaveValue("한글  검색 ");
    await expect(canvas.getByRole("status", { name: "Search 검색어" }).textContent).toBe(
      "한글  검색 ",
    );

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
    await waitFor(() => expect(search).toHaveValue(""));
    await expect(search).not.toHaveFocus();

    await userEvent.click(search);
    await waitFor(() => expect(activePanel).toHaveTextContent("search"));
    await userEvent.click(canvas.getByRole("button", { name: "패널 밖" }));
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
  },
};

export const WindowsDisabled: Story = {
  parameters: {
    taskbarDescription:
      "시작 버튼만 사용할 수 없는 상태입니다. 검색창은 독립적으로 입력할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" windowsDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("없음");
  },
};

export const SearchDisabled: Story = {
  parameters: {
    taskbarDescription: "검색창만 입력할 수 없는 상태입니다. 시작 버튼은 사용할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" searchDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "검색" }));
    await expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("없음");
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("start"),
    );
  },
};

export const Mobile: Story = {
  parameters: {
    taskbarDescription:
      "파일 탐색기 → Chrome → 시간 순서입니다. 자동 입력 후 요청 횟수·대상과 포커스를 보여 줍니다. 실제 창 완료는 검증하지 않습니다.",
  },
  render: () => <RootStory mode="mobile" />,
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "mobile");
    const canvas = within(canvasElement);
    const fileExplorer = canvas.getByRole("button", { name: "파일 탐색기" });
    const chrome = canvas.getByRole("button", { name: "Chrome" });

    await userEvent.click(fileExplorer);
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("file-explorer");

    await userEvent.tab();
    await expect(chrome).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("2");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("chrome");

    await userEvent.tab({ shift: true });
    await expect(fileExplorer).toHaveFocus();
    await expect(getComputedStyle(fileExplorer).boxShadow).not.toBe("none");
    await userEvent.keyboard(" ");
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("3");
  },
};

export const MobileChromeActive: Story = {
  parameters: {
    taskbarDescription:
      "Chrome이 활성 상태여도 입력 요청을 전달합니다. 현재 창 유지 여부는 mobile headless 정책이 결정합니다.",
  },
  render: () => <RootStory activeApplication="chrome" mode="mobile" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("button", { name: "Chrome" });
    await expect(chrome).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chrome);
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("chrome");
  },
};

export const NotReady: Story = {
  parameters: {
    taskbarDescription: "공통 Window 상태 준비 전에는 빈 Taskbar surface만 표시합니다.",
  },
  render: () => <RootStory />,
};
