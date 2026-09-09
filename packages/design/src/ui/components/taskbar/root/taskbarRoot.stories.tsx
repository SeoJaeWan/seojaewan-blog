import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  TaskbarPreview,
  withTaskbarDescription,
} from "../../../../../.storybook/taskbarPreview.js";
import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  TaskbarApplicationId,
  TaskbarRootAction,
  TaskbarTimestampClock,
  TaskbarTimestampTimer,
  WindowAction,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import { HeadlessRuntimeProvider } from "../../../../headless/index.js";
import { TaskbarRoot } from "./index.js";

const STORY_TIMESTAMP_CLOCK: TaskbarTimestampClock = Object.freeze({
  /** plan의 Asia/Seoul 고정 wall-clock과 같은 local Date를 반환한다. */
  now: () => new Date(2026, 6, 10, 15, 24, 0, 0),
  /** visual fixture의 clock을 진행시키지 않고 timer identity만 충족한다. */
  setTimeout: () => 0 as unknown as TaskbarTimestampTimer,
  /** visual fixture에는 취소할 실제 timer가 없다. */
  clearTimeout: () => undefined,
});

/** Story가 지정한 공통 mode 또는 준비 전 상태를 제공하는 최소 Window runtime을 만든다. */
const createStoryRuntime = (
  mode?: WindowMode,
  activeApplication?: TaskbarApplicationId,
  executeRootAction: (action: TaskbarRootAction) => void = () => undefined,
  executeWindowAction: (action: WindowAction) => void = () => undefined,
): HeadlessRuntime => {
  const viewModel: ControllerViewModel<WindowState> =
    mode === undefined
      ? Object.freeze({ status: "not-ready", snapshot: null })
      : Object.freeze({
          status: "ready",
          snapshot: Object.freeze({
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
          }),
        });
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute: (action: WindowAction) => {
      executeWindowAction(action);
      return {} as never;
    },
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;

  return Object.freeze({
    taskbarRoot: Object.freeze({ execute: executeRootAction }),
    windows,
  }) as unknown as HeadlessRuntime;
};

/** production Root를 실제 provider 안에서 렌더링한다. */
const RootStory = ({
  mode,
  activeApplication,
  searchDisabled = false,
  searchSelected = false,
  windowsDisabled = false,
  windowsSelected = false,
}: {
  mode?: WindowMode;
  activeApplication?: TaskbarApplicationId;
  searchDisabled?: boolean;
  searchSelected?: boolean;
  windowsDisabled?: boolean;
  windowsSelected?: boolean;
}) => {
  const [query, setQuery] = useState("");
  const [windowsRequestCount, setWindowsRequestCount] = useState(0);
  const [searchRequestCount, setSearchRequestCount] = useState(0);
  const [mobileActionCount, setMobileActionCount] = useState(0);
  const [lastMobileApplication, setLastMobileApplication] = useState("없음");
  const runtime = useMemo(
    () =>
      createStoryRuntime(
        mode,
        activeApplication,
        (action) => {
          if (action.type === "request-windows") {
            setWindowsRequestCount((current) => current + 1);
          } else {
            setSearchRequestCount((current) => current + 1);
          }
        },
        (action) => {
          if (action.type !== "launch-mobile-application") return;
          setMobileActionCount((current) => current + 1);
          setLastMobileApplication(action.applicationId);
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
            <p>
              현재 검색어: <output aria-label="현재 검색어">{query || "(비어 있음)"}</output>
            </p>
            <p>
              시작 요청: <output aria-label="시작 요청 횟수">{windowsRequestCount}</output>
            </p>
            <p>
              검색 진입: <output aria-label="검색 진입 횟수">{searchRequestCount}</output>
            </p>
            <p>
              앱 요청: <output aria-label="앱 요청 횟수">{mobileActionCount}</output>
            </p>
            <p>
              마지막 앱:{" "}
              <output aria-label="마지막 선택한 앱">{lastMobileApplication}</output>
            </p>
          </>
        }
      >
        <TaskbarRoot
          searchValue={query}
          onSearchValueChange={setQuery}
          searchDisabled={searchDisabled}
          searchSelected={searchSelected}
          timestampClock={STORY_TIMESTAMP_CLOCK}
          windowsDisabled={windowsDisabled}
          windowsSelected={windowsSelected}
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
          "화면 아래에 표시되는 작업 표시줄입니다. 데스크톱에서는 시작 버튼과 검색창, 모바일에서는 파일 탐색기와 Chrome 버튼을 보여 주며 오른쪽에는 시간과 날짜가 표시됩니다. 시작·검색 패널과 데스크톱의 실행 중 앱 목록은 아직 연결하지 않았습니다.",
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
      "데스크톱 구성과 입력 연결을 자동 확인합니다. 검색창에 직접 입력하면 현재 검색어가 갱신됩니다. 패널과 실행 중 앱 목록은 후속 작업입니다.",
  },
  render: () => <RootStory mode="desktop" />,
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "desktop");
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "시작 요청 횟수" })).toHaveTextContent(
      "1",
    );
    await userEvent.click(canvas.getByRole("textbox", { name: "검색" }));
    await expect(canvas.getByRole("status", { name: "검색 진입 횟수" })).toHaveTextContent("1");
  },
};

export const WindowsSelected: Story = {
  name: "시작 버튼 · 선택 상태",
  parameters: {
    taskbarDescription:
      "시작 버튼의 지속 선택 표현입니다. 실제 시작 패널은 아직 연결하지 않았습니다.",
  },
  render: () => <RootStory mode="desktop" windowsSelected />,
  play: async ({ canvasElement }) => {
    const windows = within(canvasElement).getByRole("button", { name: "시작" });
    await expect(windows).toHaveAttribute("aria-pressed", "true");
  },
};

export const WindowsDisabled: Story = {
  name: "시작 버튼 · 사용 불가",
  parameters: {
    taskbarDescription:
      "시작 버튼만 사용할 수 없는 상태입니다. 검색창은 독립적으로 입력할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" windowsDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "시작 요청 횟수" })).toHaveTextContent(
      "0",
    );
  },
};

export const SearchSelected: Story = {
  name: "검색창 · 선택 상태",
  parameters: {
    taskbarDescription:
      "검색창의 외부 선택 표현입니다. 직접 입력할 수 있으며 결과 패널은 아직 연결하지 않았습니다.",
  },
  render: () => <RootStory mode="desktop" searchSelected />,
  play: async ({ canvasElement }) => {
    const search = within(canvasElement).getByRole("textbox", { name: "검색" });
    await expect(search).toHaveAttribute("data-selected", "true");
    await expect(search).not.toHaveAttribute("aria-expanded");
    await expect(search).not.toHaveAttribute("aria-controls");
  },
};

export const SearchDisabled: Story = {
  name: "검색창 · 사용 불가",
  parameters: {
    taskbarDescription: "검색창만 입력할 수 없는 상태입니다. 시작 버튼은 사용할 수 있습니다.",
  },
  render: () => <RootStory mode="desktop" searchDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "검색" }));
    await expect(canvas.getByRole("status", { name: "검색 진입 횟수" })).toHaveTextContent("0");
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "시작 요청 횟수" })).toHaveTextContent(
      "1",
    );
  },
};

export const Mobile: Story = {
  name: "모바일",
  parameters: {
    taskbarDescription:
      "파일 탐색기 → Chrome → 시간 순서입니다. 자동 입력 후 요청 횟수·대상과 포커스를 보여 줍니다. 이 예제에서는 실제 창을 열지 않습니다.",
  },
  render: () => <RootStory mode="mobile" />,
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "mobile");
    const canvas = within(canvasElement);
    const fileExplorer = canvas.getByRole("button", { name: "파일 탐색기" });
    const chrome = canvas.getByRole("button", { name: "Chrome" });

    await userEvent.click(fileExplorer);
    await expect(canvas.getByRole("status", { name: "앱 요청 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 선택한 앱" }),
    ).toHaveTextContent("file-explorer");

    await userEvent.tab();
    await expect(chrome).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status", { name: "앱 요청 횟수" })).toHaveTextContent("2");
    await expect(
      canvas.getByRole("status", { name: "마지막 선택한 앱" }),
    ).toHaveTextContent("chrome");

    await userEvent.tab({ shift: true });
    await expect(fileExplorer).toHaveFocus();
    await expect(getComputedStyle(fileExplorer).boxShadow).not.toBe("none");
    await userEvent.keyboard(" ");
    await expect(canvas.getByRole("status", { name: "앱 요청 횟수" })).toHaveTextContent("3");
  },
};

export const MobileChromeActive: Story = {
  name: "모바일 · Chrome 활성 상태",
  parameters: {
    taskbarDescription:
      "Chrome이 활성 상태여도 입력 요청을 전달합니다. 이 예제에서는 요청 횟수와 대상 앱을 확인하며 실제 창은 열지 않습니다.",
  },
  render: () => <RootStory activeApplication="chrome" mode="mobile" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("button", { name: "Chrome" });
    await expect(chrome).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chrome);
    await expect(canvas.getByRole("status", { name: "앱 요청 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 선택한 앱" }),
    ).toHaveTextContent("chrome");
  },
};

export const NotReady: Story = {
  name: "준비 중",
  parameters: {
    taskbarDescription: "화면 구성이 준비되기 전에는 작업 표시줄의 배경만 표시합니다.",
  },
  render: () => <RootStory />,
};
