import {
  Code20Regular,
  Document20Regular,
  Folder20Regular,
  Open16Regular,
  Pin16Regular,
  Settings20Regular,
} from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { FolderFileCardUI, FolderFileGridUI } from "../folder";
import { WindowFrameUI, WindowTabUI, WindowTitleBarUI } from "../window";
import { TaskbarPreviewUI, TaskbarUI, WindowPanelUI } from "./index";

import "./taskbarRootUI.stories.css";

const FIXED_CLOCK = new Date("2026-09-01T06:24:00.000Z");
const onContextAction = fn();
const onContextTaskSelect = fn();
const onDetailAction = fn();
const onGroupAction = fn();
const onItemSelect = fn();
const onPreviewClose = fn();
const onPreviewSelect = fn();

const ENTRIES = [
  { icon: <Folder20Regular />, label: "파일 탐색기", value: "folder" },
  { icon: <Code20Regular />, label: "개발 노트", value: "notes" },
  { icon: <Settings20Regular />, label: "설정", value: "settings" },
  { icon: <Document20Regular />, label: "구성요소 계약", value: "contract" },
  { icon: <Document20Regular />, label: "테스트 규칙", value: "testing" },
  { icon: <Document20Regular />, label: "작업 계획", value: "plan" },
] as const;

const PREVIEW_WINDOW = (
  <WindowFrameUI
    aria-label="파일 탐색기 preview 창"
    bounds={{ blockSize: 1024, inlineSize: 1920 }}
    titleBar={
      <WindowTitleBarUI>
        <WindowTabUI icon={<Folder20Regular aria-hidden="true" />} titleContent="파일 탐색기" />
      </WindowTitleBarUI>
    }
  >
    <FolderFileGridUI aria-label="미리 보기 파일" cardSize="large">
      <FolderFileCardUI cover={<Document20Regular aria-hidden="true" />} title="문서" />
      <FolderFileCardUI cover={<Folder20Regular aria-hidden="true" />} title="사진" />
    </FolderFileGridUI>
  </WindowFrameUI>
);

const meta = {
  title: "UI/Components/Taskbar",
  component: TaskbarUI,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "TaskbarUI는 Start Pinned/All, Search recommendation/results/detail, running groups, scaled session previews, production ContextMenuUI와 clock을 완성합니다. UI-local open·focus·portal·placement·presence만 private family state로 소유하며 전달받은 opaque presentation value의 제품 의미는 해석하지 않습니다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProductReference: Story = {
  name: "Product Reference — Windows taskbar 전체 조합",
  args: {
    "aria-label": "작업 표시줄",
    allSections: [
      { category: "F", entries: [ENTRIES[0]] },
      { category: "N", entries: [ENTRIES[1]] },
      { category: "S", entries: [ENTRIES[2]] },
    ],
    bestSections: [
      { entries: [ENTRIES[0], ENTRIES[1], ENTRIES[2]], title: "자주 사용" },
      { entries: [ENTRIES[3], ENTRIES[4], ENTRIES[5]], title: "최근 문서" },
    ],
    clockTimeZone: "Asia/Seoul",
    clockValue: FIXED_CLOCK,
    detailActions: [
      { icon: <Open16Regular />, label: "열기", value: "open" },
      { icon: <Pin16Regular />, label: "시작 화면에 고정", value: "pin-start" },
    ],
    groups: [
      { icon: <Settings20Regular />, label: "대기 앱", state: "idle", value: "idle" },
      {
        icon: <Folder20Regular />,
        label: "실행 중인 파일 탐색기",
        previews: [
          {
            icon: <Folder20Regular />,
            label: "문서 파일 탐색기",
            preview: PREVIEW_WINDOW,
            value: "folder-preview",
          },
        ],
        state: "running",
        value: "folder-group",
      },
      {
        actions: [
          { icon: <Open16Regular />, label: "새 창 열기", trailing: "Enter", value: "new" },
          { icon: <Pin16Regular />, label: "작업 표시줄에서 제거", value: "unpin" },
        ],
        icon: <Code20Regular />,
        label: "활성 개발 노트",
        state: "active",
        tasks: [{ icon: <Document20Regular />, label: "최근 개발 노트", value: "recent-note" }],
        value: "notes-group",
      },
    ],
    onContextAction,
    onContextTaskSelect,
    onDetailAction,
    onGroupAction,
    onItemSelect,
    onPreviewClose,
    onPreviewSelect,
    pinnedItems: ENTRIES,
    recommendedItems: [ENTRIES[3], ENTRIES[4], ENTRIES[5]],
    results: [
      { ...ENTRIES[3], description: "HDJG-26" },
      { ...ENTRIES[4], description: "UI convention" },
    ],
  },
  render: (args) => (
    <main className="wd-taskbar-product-reference">
      <section aria-label="Windows desktop" className="wd-taskbar-product-reference__desktop">
        <p>Windows 11 taskbar Product Reference</p>
        <article>
          <Document20Regular aria-hidden="true" />
          <span>HDJG-26 production Component 완전성</span>
        </article>
      </section>
      <TaskbarUI {...args} />
    </main>
  ),
  play: async ({ canvasElement }) => {
    for (const mock of [
      onContextAction,
      onContextTaskSelect,
      onDetailAction,
      onGroupAction,
      onItemSelect,
      onPreviewClose,
      onPreviewSelect,
    ])
      mock.mockClear();

    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const desktop = canvas.getByLabelText("Windows desktop");
    const root = canvas.getByRole("navigation", { name: "작업 표시줄" });
    const start = canvas.getByRole("button", { name: "시작" });
    const searchTrigger = canvas.getByRole("button", { name: "검색" });
    const running = canvas.getByRole("button", { name: "실행 중인 파일 탐색기" });
    const active = canvas.getByRole("button", { name: "활성 개발 노트" });

    await expect(root.getBoundingClientRect().height).toBeCloseTo(50, 0);
    await expect(root.getBoundingClientRect().width).toBeCloseTo(window.innerWidth, 0);
    await expect(getComputedStyle(root).position).toBe("fixed");
    await expect(canvas.getByLabelText("날짜 및 시간")).toHaveTextContent("2026-09-01");

    await userEvent.click(start);
    const startDialog = await page.findByRole("dialog", { name: "시작 메뉴" });
    await expect(startDialog).toHaveTextContent("고정됨");
    await expect(page.getByRole("searchbox", { name: "시작 메뉴 검색" })).toHaveFocus();
    await userEvent.click(page.getByRole("button", { name: "모두" }));
    await expect(page.getByRole("heading", { name: "모두" })).toBeVisible();
    await userEvent.click(
      within(page.getByRole("group", { name: "모든 항목" })).getByRole("button", { name: "F" }),
    );
    const categoryOverlay = page.getByRole("group", { name: "카테고리 이동" });
    await expect(categoryOverlay).toHaveAttribute("data-open", "true");
    await userEvent.click(within(categoryOverlay).getByRole("button", { name: "F" }));
    await userEvent.click(page.getByRole("button", { name: "파일 탐색기" }));
    await expect(onItemSelect).toHaveBeenCalledWith("folder");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog", { name: "시작 메뉴" })).toBeNull());
    await expect(start).toHaveFocus();

    await userEvent.click(searchTrigger);
    const searchDialog = await page.findByRole("dialog", { name: "검색" });
    const search = page.getByRole("searchbox", { name: "작업 표시줄 검색" });
    await expect(searchDialog).toHaveTextContent("추천");
    await expect(search).toHaveFocus();
    await userEvent.type(search, "문서");
    await expect(searchDialog).toHaveTextContent("최적의 일치");
    await userEvent.click(page.getByRole("button", { name: "구성요소 계약 자세히" }));
    await expect(page.getByRole("region", { name: "구성요소 계약 상세" })).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "열기" }));
    await expect(onDetailAction).toHaveBeenCalledWith("open", "contract");
    await userEvent.click(desktop);
    await waitFor(() => expect(page.queryByRole("dialog", { name: "검색" })).toBeNull());

    await userEvent.hover(running);
    const previewDialog = await page.findByRole("dialog", {
      name: "실행 중인 파일 탐색기 미리 보기",
    });
    await expect(
      within(previewDialog).getByRole("button", { name: "문서 파일 탐색기" }),
    ).toBeVisible();
    await expect(within(previewDialog).getByLabelText("파일 탐색기 preview 창")).toBeVisible();
    await userEvent.click(within(previewDialog).getByRole("button", { name: "문서 파일 탐색기" }));
    await expect(onPreviewSelect).toHaveBeenCalledWith("folder-group", "folder-preview");
    await userEvent.keyboard("{Escape}");

    await userEvent.pointer({ keys: "[MouseRight]", target: active });
    const menu = await page.findByRole("menu", { name: "활성 개발 노트 작업" });
    const recentItem = within(menu).getByRole("menuitem", { name: /최근 개발 노트/ });
    const newWindowItem = within(menu).getByRole("menuitem", { name: /새 창 열기/ });
    await waitFor(() => expect(recentItem).toBeVisible());
    await userEvent.click(newWindowItem);
    await expect(onContextAction).toHaveBeenCalledWith("notes-group", "new");
  },
};

const durationInMilliseconds = (duration: string) =>
  duration.endsWith("ms") ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000;

export const PreviewAndPanelStates: Story = {
  name: "Contract — preview와 panel transition 상태",
  render: () => (
    <div className="wd-taskbar-contract-stage">
      <TaskbarPreviewUI
        aria-label="진입 중인 미리 보기"
        data-testid="preview-entering"
        preview="entering"
        state="entering"
        title="진입 preview"
      />
      <TaskbarPreviewUI
        aria-label="퇴장 중인 미리 보기"
        data-testid="preview-exiting"
        preview="exiting"
        state="exiting"
        title="퇴장 preview"
      />
      <WindowPanelUI
        aria-label="진입 중인 시작 panel"
        data-testid="panel-entering"
        role="dialog"
        state="entering"
      >
        entering
      </WindowPanelUI>
      <WindowPanelUI
        aria-label="퇴장 중인 시작 panel"
        data-testid="panel-exiting"
        role="dialog"
        state="exiting"
      >
        exiting
      </WindowPanelUI>
      <TaskbarPreviewUI
        data-testid="preview-hidden"
        preview="hidden"
        state="hidden"
        title="hidden"
      />
      <WindowPanelUI data-testid="panel-hidden" state="hidden">
        hidden
      </WindowPanelUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const previewEntering = canvas.getByTestId("preview-entering");
    const previewExiting = canvas.getByTestId("preview-exiting");
    const panelEntering = canvas.getByTestId("panel-entering");
    const panelExiting = canvas.getByTestId("panel-exiting");
    await expect(getComputedStyle(previewEntering).animationName).toBe(
      "wd-taskbar-preview-ui-enter",
    );
    await expect(getComputedStyle(previewExiting).animationName).toBe("wd-taskbar-preview-ui-exit");
    await expect(durationInMilliseconds(getComputedStyle(previewEntering).animationDuration)).toBe(
      200,
    );
    await expect(durationInMilliseconds(getComputedStyle(previewExiting).animationDuration)).toBe(
      150,
    );
    await expect(getComputedStyle(panelEntering).animationName).toBe("wd-window-panel-ui-enter");
    await expect(getComputedStyle(panelExiting).animationName).toBe("wd-window-panel-ui-exit");
    await expect(canvas.getByTestId("preview-hidden")).not.toBeVisible();
    await expect(canvas.getByTestId("panel-hidden")).not.toBeVisible();
  },
};

export const MobilePanelWidth: Story = {
  name: "Contract — mobile panel 100vw",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <WindowPanelUI data-testid="mobile-panel">mobile</WindowPanelUI>,
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByTestId("mobile-panel");
    await expect(panel.getBoundingClientRect().width).toBeCloseTo(window.innerWidth, 0);
  },
};

export const ReducedMotionSemanticResult: Story = {
  name: "Contract — reduced motion semantic 결과",
  render: () => (
    <div className="wd-taskbar-contract-stage">
      <TaskbarPreviewUI
        motion="reduced"
        preview="preview"
        state="entering"
        title="reduced preview"
      />
      <WindowPanelUI aria-label="reduced panel" motion="reduced" role="dialog" state="exiting">
        panel
      </WindowPanelUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByRole("region", { name: "reduced preview" });
    const panel = canvas.getByRole("dialog", { name: "reduced panel" });
    await expect(
      durationInMilliseconds(getComputedStyle(preview).animationDuration),
    ).toBeLessThanOrEqual(0.01);
    await expect(
      durationInMilliseconds(getComputedStyle(panel).animationDuration),
    ).toBeLessThanOrEqual(0.01);
  },
};
