import type { ReactNode } from "react";
import { useMemo } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { HeadlessRuntimeAdapters, WindowState } from "../../../../headless/index.js";
import { createHeadlessRuntime, HeadlessRuntimeProvider } from "../../../../headless/index.js";
import {
  type TaskbarPanelsConnection,
  useTaskbarPanelsConnection,
} from "../panels/connection/index.js";
import { TaskbarStart } from "./taskbarStart.js";

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

export const Interaction: Story = {
  name: "Start 입력과 닫힘 흐름",
  parameters: {
    taskbarDescription:
      "시작 버튼 toggle, 상단 input의 한글·공백 보존, 내부 focus 유지, 외부 interaction dismiss와 close 완료 초기화를 실제 browser에서 확인합니다.",
  },
  render: () => <StartStory />,
  play: async () => {
    const page = within(document.body);
    const button = page.getByRole("button", { name: "시작" });
    const outside = page.getByRole("button", { name: "패널 밖" });

    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByRole("dialog", { name: "시작" })).not.toHaveAttribute("data-starting-style"),
    );
    const input = page.getByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });
    await expect(button).toHaveFocus();
    await expect(input).not.toHaveFocus();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(input);
    await userEvent.type(input, "한글  query ");
    await expect(input).toHaveValue("한글  query ");
    await expect(page.getByRole("dialog", { name: "시작" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Start 검색어" }).textContent).toBe(
      "한글  query ",
    );

    await userEvent.click(outside);
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(page.getByRole("status", { name: "Start 검색어" })).toHaveTextContent(
      "(비어 있음)",
    );

    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByRole("dialog", { name: "시작" })).not.toHaveAttribute("data-starting-style"),
    );
    const reopenedInput = page.getByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });
    await expect(reopenedInput).toHaveValue("");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
  },
};
