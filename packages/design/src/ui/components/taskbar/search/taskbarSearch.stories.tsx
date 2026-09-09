import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  TaskbarPreview,
  withTaskbarDescription,
} from "../../../../../.storybook/taskbarPreview.js";
import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type WindowState,
} from "../../../../headless/index.js";
import { useTaskbarPanelsConnection } from "../panels/connection/index.js";
import { TaskbarSearch } from "./taskbarSearch.js";
import { TaskbarSearchPanel } from "./taskbarSearchPanel.js";

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

/**
 * 실제 검색어와 진입 요청을 Canvas에서 보여준다.
 *
 * 결과 panel을 모사하지 않고 입력값과 focus 진입의 관찰만 제공한다.
 */
const SearchExample = () => {
  const [value, setValue] = useState("");
  const [count, setCount] = useState(0);
  return (
    <TaskbarPreview
      results={
        <>
          <p>
            입력값: <output aria-label="현재 검색어">{value || "(비어 있음)"}</output>
          </p>
          <p>
            검색 진입: <output aria-label="Search Action 횟수">{count}</output>
          </p>
        </>
      }
    >
      <TaskbarSearch
        value={value}
        onValueChange={setValue}
        onAction={() => setCount((current) => current + 1)}
      />
    </TaskbarPreview>
  );
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
  component: TaskbarSearch,
  tags: ["autodocs"],
  render: (args) => (
    <TaskbarPreview>
      <TaskbarSearch {...args} />
    </TaskbarPreview>
  ),
  decorators: [withTaskbarDescription],
  parameters: {
    docs: {
      description: {
        component:
          "작업 표시줄에서 직접 검색어를 입력하는 창이다. 제품 조합에서는 같은 input이 panel trigger로 유지되고 headless query·open lifecycle에 연결된다. 검색 결과·추천·recent·detail 본문은 후속 Search 제품 view가 제공한다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 입력해 보기",
  parameters: {
    taskbarDescription:
      "검색창을 클릭하거나 Tab으로 이동한 뒤 입력해 보세요. 한글·공백을 입력하고 선택·삭제할 수 있습니다. 아래에서 현재 입력값과 검색 진입 횟수를 확인할 수 있습니다.",
  },
  render: () => <SearchExample />,
};

export const Selected: Story = {
  name: "선택 상태",
  args: { selected: true },
  parameters: {
    taskbarDescription:
      "선택된 검색창의 배경과 푸른 돋보기를 보여 줍니다. 실제 입력창에 포커스가 생겨도 돋보기가 푸른색으로 바뀝니다.",
  },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    pseudo: { hover: ".taskbar-search" },
    taskbarDescription:
      "검색창에 마우스를 올렸을 때의 밝은 배경을 고정해 보여 줍니다. 입력하려면 클릭하세요.",
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    pseudo: { focus: ".taskbar-search", focusVisible: ".taskbar-search" },
    taskbarDescription:
      "포커스 테두리와 중앙에 정렬된 푸른 돋보기를 보여 줍니다. 포커스 중에는 ‘검색’ 안내 문구가 숨겨집니다.",
  },
};

export const Disabled: Story = {
  name: "사용 불가",
  args: { disabled: true },
  parameters: {
    taskbarDescription:
      "검색을 사용할 수 없어 흐리게 표시됩니다. 클릭하거나 Tab으로 입력할 수 없고 검색 진입 요청도 보내지 않습니다.",
  },
};

export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    pseudo: { active: ".taskbar-search-surface", focus: ".taskbar-search" },
    taskbarDescription:
      "검색창을 누른 모습을 고정해 보여 줍니다. 돋보기는 원래 크기를 유지하고, 입력 포커스에 따라 푸른색으로 표시됩니다.",
  },
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector(".taskbar-search__icon");
    await expect(icon).toHaveStyle({ transform: "none" });
  },
};

export const Interaction: Story = {
  name: "입력 흐름 자동 확인",
  parameters: {
    taskbarDescription:
      "자동으로 Tab 진입 → 입력 → 재클릭 → 내용 교체 → 삭제를 확인합니다. 검색 진입은 focus를 얻을 때 한 번 발생하며, 글자나 공백마다 열기 요청을 보내지 않습니다. 직접 조작은 ‘직접 입력해 보기’에서 시작하세요.",
  },
  render: () => <SearchExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "검색" });
    const count = canvas.getByRole("status", { name: "Search Action 횟수" });
    await expect(getComputedStyle(input, "::placeholder").opacity).toBe("1");
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await expect(getComputedStyle(input, "::placeholder").opacity).toBe("0");
    const icon = canvasElement.querySelector(".taskbar-search__icon")!;
    await waitFor(() => expect(getComputedStyle(icon, "::after").opacity).toBe("1"));
    await userEvent.type(input, "hello world");
    await expect(input).toHaveValue("hello world");
    await expect(count).toHaveTextContent("1");
    await userEvent.click(input);
    await expect(input).toHaveFocus();
    await expect(count).toHaveTextContent("1");
    await userEvent.clear(input);
    await userEvent.type(input, "검색어");
    await expect(input).toHaveValue("검색어");
    await expect(canvas.getByRole("status", { name: "현재 검색어" })).toHaveTextContent("검색어");
    await userEvent.clear(input);
    await expect(input).toHaveValue("");
    await userEvent.tab();
    await expect(input).not.toHaveFocus();
    await expect(getComputedStyle(input, "::placeholder").opacity).toBe("1");
    await waitFor(() => expect(getComputedStyle(icon, "::after").opacity).toBe("0"));
    await userEvent.click(input);
    await waitFor(() => expect(getComputedStyle(icon, "::after").opacity).toBe("1"));
    await expect(count).toHaveTextContent("2");
  },
};

export const ConnectedPanelLifecycle: Story = {
  name: "Search panel 연결 자동 확인",
  parameters: {
    docs: { story: { iframeHeight: 700, inline: false } },
    layout: "fullscreen",
    taskbarDescription:
      "실제 Taskbar input 하나로 panel을 열고 한글·공백 입력과 재클릭 focus 유지, Escape blur·focus 미복원, close 완료 뒤 query 초기화를 확인합니다. 패널 본문은 후속 작업의 소유 경계를 표시합니다.",
  },
  render: () => <ConnectedSearchStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const input = canvas.getByRole("textbox", { name: "검색" });

    await userEvent.click(input);
    await expect(input).toHaveFocus();
    const panel = await page.findByRole("dialog", { name: "검색" });
    await waitFor(() => expect(panel).toBeVisible());
    await expect(page.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);

    await userEvent.paste("한글  검색 ");
    await expect(input).toHaveValue("한글  검색 ");
    const query = canvas.getByRole("status", { name: "연결된 검색어" });
    await expect(query.textContent).toBe("한글  검색 ");
    await userEvent.click(input);
    await expect(input).toHaveFocus();
    await waitFor(() => expect(panel).toBeVisible());

    await userEvent.keyboard("{Escape}");
    await expect(input).not.toHaveFocus();
    await waitFor(() => expect(panel).toHaveAttribute("aria-hidden", "true"));
    await expect(panel).toHaveAttribute("inert");
    await expect(query.textContent).toBe("한글  검색 ");
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(input).not.toHaveFocus();
    await expect(input).toHaveValue("");
    await expect(query.textContent).toBe("(비어 있음)");

    await userEvent.click(input);
    const reopenedPanel = await page.findByRole("dialog", { name: "검색" });
    await waitFor(() => expect(reopenedPanel).toBeVisible());
    await userEvent.paste("외부 dismiss");
    await userEvent.click(reopenedPanel);
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(canvas.getByRole("button", { name: "패널 밖" }));
    await waitFor(() => expect(reopenedPanel).toHaveAttribute("aria-hidden", "true"));
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(input).toHaveValue("");
  },
};
