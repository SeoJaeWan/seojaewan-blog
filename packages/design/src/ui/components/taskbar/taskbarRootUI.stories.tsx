import { useState } from "react";

import {
  Code20Regular,
  Document20Regular,
  Folder20Regular,
  Settings20Regular,
} from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI, PopoverUI } from "../../primitives";
import {
  TaskbarAppListUI,
  TaskbarClockUI,
  TaskbarItemUI,
  TaskbarPreviewUI,
  TaskbarRootUI,
  TaskbarSearchUI,
  TaskbarStartButtonUI,
  WindowPanelUI,
} from "./index";

import "./taskbarRootUI.stories.css";

const FIXED_CLOCK = new Date("2026-09-01T06:24:00.000Z");
const onTaskbarAction = fn();
const onDisabledTaskbarAction = fn();

const meta = {
  title: "UI/Components/Taskbar",
  component: TaskbarRootUI,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "TaskbarRootUI, StartButtonUI, SearchUI, AppListUI, ItemUI와 ClockUI는 Windows taskbar의 실제 visual roles를 제공합니다. Start와 Item은 IconButtonUI, Search는 InputUI를 사용합니다. Product Reference의 Start, Search와 hover preview anchor는 PopoverUI가 맡고 WindowPanelUI와 TaskbarPreviewUI는 caller content를 표시하는 surface에 머뭅니다. 검색 실행, app/session 계산, hover 지연과 window activation은 Taskbar 기능 또는 Shell이 맡습니다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarRootUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const ProductTaskbar = () => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [startOpen, setStartOpen] = useState(false);

  return (
    <main className="wd-taskbar-product-reference">
      <section aria-label="Windows desktop" className="wd-taskbar-product-reference__desktop">
        <p>Windows 11 taskbar Product Reference</p>
        <article className="wd-taskbar-product-reference__desktop-card">
          <Document20Regular aria-hidden="true" />
          <span>HDJG-26 역할·Primitive 완전성</span>
        </article>
      </section>

      <TaskbarRootUI aria-label="작업 표시줄" data-testid="product-taskbar-root">
        <PopoverUI open={startOpen} onOpenChange={setStartOpen}>
          <PopoverUI.Trigger render={<TaskbarStartButtonUI selected={startOpen} />} />
          <PopoverUI.Content
            align="start"
            className="wd-taskbar-product-reference__surface-anchor"
            side="top"
            sideOffset={8}
          >
            <PopoverUI.Title className="wd-taskbar-product-reference__sr-only">
              시작 메뉴
            </PopoverUI.Title>
            <WindowPanelUI aria-label="시작 panel visual" data-testid="product-window-panel">
              <TaskbarSearchUI aria-label="시작 메뉴 검색" placeholder="앱 및 문서 검색" />
              <div className="wd-taskbar-product-reference__panel-header">
                <strong>고정됨</strong>
                <ButtonUI>모두</ButtonUI>
              </div>
              <div className="wd-taskbar-product-reference__pinned-grid">
                <ButtonUI>
                  <Folder20Regular aria-hidden="true" />
                  파일 탐색기
                </ButtonUI>
                <ButtonUI>
                  <Code20Regular aria-hidden="true" />
                  개발 노트
                </ButtonUI>
                <ButtonUI>
                  <Settings20Regular aria-hidden="true" />
                  설정
                </ButtonUI>
              </div>
              <p className="wd-taskbar-product-reference__panel-note">
                panel data와 app 실행은 이 표시 component 밖에서 연결됩니다.
              </p>
            </WindowPanelUI>
          </PopoverUI.Content>
        </PopoverUI>

        <PopoverUI open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverUI.Trigger
            render={
              <ButtonUI className="wd-taskbar-search-trigger-ui">
                <span>{searchValue || "검색"}</span>
              </ButtonUI>
            }
          />
          <PopoverUI.Content
            align="start"
            aria-label="검색 추천"
            className="wd-taskbar-product-reference__search-results"
            side="top"
          >
            <PopoverUI.Title>검색 추천</PopoverUI.Title>
            <PopoverUI.Description>
              {searchValue ? `“${searchValue}”의 표시 예시` : "앱, 문서 및 설정을 찾아보세요."}
            </PopoverUI.Description>
            <TaskbarSearchUI
              aria-label="작업 표시줄 검색"
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              placeholder="앱, 문서 및 설정 검색"
              value={searchValue}
            />
            <div className="wd-taskbar-product-reference__search-row">
              <Document20Regular aria-hidden="true" />
              <span>{searchValue || "최근 문서"}</span>
            </div>
          </PopoverUI.Content>
        </PopoverUI>

        <TaskbarAppListUI aria-label="앱 목록" role="group">
          <TaskbarItemUI icon={<Settings20Regular />} label="대기 앱" />
          <PopoverUI open={previewOpen} onOpenChange={setPreviewOpen}>
            <PopoverUI.Trigger
              onPointerEnter={() => setPreviewOpen(true)}
              onPointerLeave={() => setPreviewOpen(false)}
              render={
                <TaskbarItemUI
                  data-testid="product-running-item"
                  icon={<Folder20Regular />}
                  label="실행 중인 파일 탐색기"
                  onAction={onTaskbarAction}
                  state="running"
                />
              }
            />
            <PopoverUI.Content
              className="wd-taskbar-product-reference__surface-anchor"
              initialFocus={false}
              side="top"
              sideOffset={8}
            >
              <PopoverUI.Title className="wd-taskbar-product-reference__sr-only">
                파일 탐색기 미리 보기
              </PopoverUI.Title>
              <TaskbarPreviewUI
                aria-label="파일 탐색기 preview visual"
                preview={
                  <article className="wd-taskbar-product-reference__preview-window">
                    <header>
                      <Folder20Regular aria-hidden="true" />
                      <span>파일 탐색기</span>
                    </header>
                    <div>
                      <span>문서</span>
                      <span>사진</span>
                    </div>
                  </article>
                }
              />
            </PopoverUI.Content>
          </PopoverUI>
          <TaskbarItemUI
            data-testid="product-active-item"
            icon={<Code20Regular />}
            label="활성 개발 노트"
            onAction={onTaskbarAction}
            state="active"
          />
          <TaskbarItemUI
            disabled
            icon={<Document20Regular />}
            label="사용할 수 없는 앱"
            onAction={onDisabledTaskbarAction}
          />
        </TaskbarAppListUI>

        <TaskbarClockUI timeZone="Asia/Seoul" value={FIXED_CLOCK} />
      </TaskbarRootUI>
    </main>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Windows taskbar 전체 조합",
  parameters: {
    docs: {
      description: {
        story:
          "현재 제품에 있는 Windows taskbar를 Start, Search, app 상태, clock, hover preview와 panel surface로 재현합니다. local state는 Popover focus와 dismiss를 관찰하기 위한 fixture일 뿐 검색 실행, window activation과 hover 정책을 구현하지 않습니다.",
      },
    },
  },
  render: () => <ProductTaskbar />,
  play: async ({ canvasElement }) => {
    onTaskbarAction.mockClear();
    onDisabledTaskbarAction.mockClear();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const root = canvas.getByRole("navigation", { name: "작업 표시줄" });
    const start = canvas.getByRole("button", { name: "시작" });
    const logo = start.querySelector<SVGElement>(".wd-taskbar-start-button-ui__logo");
    const searchTrigger = canvas.getByRole("button", { name: "검색" });
    const idle = canvas.getByRole("button", { name: "대기 앱" });
    const running = canvas.getByRole("button", { name: "실행 중인 파일 탐색기" });
    const active = canvas.getByRole("button", { name: "활성 개발 노트" });
    const disabled = canvas.getByRole("button", { name: "사용할 수 없는 앱" });
    const rootStyle = getComputedStyle(root);

    await expect(root.getBoundingClientRect().height).toBeCloseTo(50, 0);
    await expect(root.getBoundingClientRect().width).toBeCloseTo(window.innerWidth, 0);
    await expect(rootStyle.position).toBe("fixed");
    await expect(rootStyle.bottom).toBe("0px");
    await expect(rootStyle.gap).toBe("12px");
    await expect(rootStyle.backdropFilter).toContain("blur(18px)");
    await expect(rootStyle.backdropFilter).toContain("saturate(1.15)");
    await expect(logo).not.toBeNull();
    await expect(logo!.getBoundingClientRect().width).toBeCloseTo(30, 0);
    await expect(logo!.getBoundingClientRect().height).toBeCloseTo(30, 0);
    await expect(searchTrigger.getBoundingClientRect().width).toBeCloseTo(220, 0);

    for (const item of [idle, running, active, disabled]) {
      await expect(item.getBoundingClientRect().width).toBeCloseTo(40, 0);
      await expect(item.getBoundingClientRect().height).toBeCloseTo(40, 0);
      await expect(item).toHaveClass("wd-icon-button-ui");
    }

    await expect(running).toHaveAttribute("data-state", "running");
    await expect(active).toHaveAttribute("data-state", "active");
    await expect(active).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByLabelText("날짜 및 시간")).toHaveTextContent("2026-09-01");

    await userEvent.click(start);
    const startDialog = await page.findByRole("dialog", { name: "시작 메뉴" });
    const panel = page.getByTestId("product-window-panel");
    const expectedWidth =
      window.innerWidth >= 1280
        ? window.innerWidth * 0.3
        : window.innerWidth >= 768
          ? window.innerWidth * 0.5
          : window.innerWidth;

    await expect(startDialog).not.toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(panel.getBoundingClientRect().height).toBeCloseTo(600, 0));
    await expect(panel.getBoundingClientRect().width).toBeCloseTo(expectedWidth, 0);
    await expect(page.getByRole("searchbox", { name: "시작 메뉴 검색" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog", { name: "시작 메뉴" })).toBeNull());
    await expect(start).toHaveFocus();

    await userEvent.click(searchTrigger);
    const searchDialog = await page.findByRole("dialog", { name: "검색 추천" });
    const search = page.getByRole("searchbox", { name: "작업 표시줄 검색" });
    await expect(searchDialog).not.toHaveAttribute("aria-modal", "true");
    await expect(search).toHaveFocus();
    await userEvent.type(search, "문서");
    await expect(search).toHaveValue("문서");
    await expect(searchDialog).toHaveTextContent("“문서”의 표시 예시");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog", { name: "검색 추천" })).toBeNull());
    await expect(searchTrigger).toHaveFocus();

    await userEvent.hover(running);
    const previewDialog = await page.findByRole("dialog", { name: "파일 탐색기 미리 보기" });
    await expect(previewDialog).not.toHaveAttribute("aria-modal", "true");
    await waitFor(() =>
      expect(page.getByRole("region", { name: "파일 탐색기 preview visual" })).toBeVisible(),
    );
    await userEvent.unhover(running);
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "파일 탐색기 미리 보기" })).toBeNull(),
    );

    await userEvent.click(active);
    await expect(onTaskbarAction).toHaveBeenCalledOnce();
    await userEvent.click(disabled);
    await expect(onDisabledTaskbarAction).not.toHaveBeenCalled();
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
        preview={<div>entering preview slot</div>}
        state="entering"
      />
      <TaskbarPreviewUI
        aria-label="퇴장 중인 미리 보기"
        data-testid="preview-exiting"
        preview={<div>exiting preview slot</div>}
        state="exiting"
      />
      <WindowPanelUI
        aria-label="진입 중인 시작 panel"
        data-testid="panel-entering"
        role="dialog"
        state="entering"
      >
        entering panel slot
      </WindowPanelUI>
      <WindowPanelUI
        aria-label="퇴장 중인 시작 panel"
        data-testid="panel-exiting"
        role="dialog"
        state="exiting"
      >
        exiting panel slot
      </WindowPanelUI>
      <TaskbarPreviewUI data-testid="preview-hidden" preview="hidden" state="hidden" />
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
    await expect(durationInMilliseconds(getComputedStyle(panelEntering).animationDuration)).toBe(
      220,
    );
    await expect(durationInMilliseconds(getComputedStyle(panelExiting).animationDuration)).toBe(
      200,
    );
    await expect(canvas.getByTestId("preview-hidden")).not.toBeVisible();
    await expect(canvas.getByTestId("panel-hidden")).not.toBeVisible();
  },
};

export const MobilePanelWidth: Story = {
  name: "Contract — mobile panel 100vw",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <WindowPanelUI aria-label="mobile 시작 panel" data-testid="mobile-panel">
      mobile panel slot
    </WindowPanelUI>
  ),
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByTestId("mobile-panel");

    await expect(window.innerWidth).toBeLessThan(768);
    await expect(panel.getBoundingClientRect().width).toBeCloseTo(window.innerWidth, 0);
  },
};

export const MediumPanelWidth: Story = {
  name: "Contract — tablet panel 50vw",
  parameters: {
    viewport: { defaultViewport: "tablet" },
  },
  render: () => (
    <WindowPanelUI aria-label="tablet 시작 panel" data-testid="tablet-panel">
      tablet panel slot
    </WindowPanelUI>
  ),
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByTestId("tablet-panel");

    await expect(window.innerWidth).toBeGreaterThanOrEqual(768);
    await expect(window.innerWidth).toBeLessThan(1280);
    await expect(panel.getBoundingClientRect().width).toBeCloseTo(window.innerWidth * 0.5, 0);
  },
};

export const ReducedMotionSemanticResult: Story = {
  name: "Contract — reduced motion semantic 결과",
  render: () => (
    <div className="wd-taskbar-contract-stage">
      <TaskbarPreviewUI
        aria-label="reduced motion 미리 보기"
        motion="reduced"
        preview="preview slot은 그대로 표시됨"
        state="entering"
      />
      <WindowPanelUI
        aria-label="reduced motion 시작 panel"
        motion="reduced"
        role="dialog"
        state="exiting"
      >
        panel slot은 lifecycle state와 함께 유지됨
      </WindowPanelUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByRole("region", { name: "reduced motion 미리 보기" });
    const panel = canvas.getByRole("dialog", { name: "reduced motion 시작 panel" });

    await expect(preview).toHaveAttribute("data-state", "entering");
    await expect(panel).toHaveAttribute("data-state", "exiting");
    await expect(preview).toHaveTextContent("preview slot은 그대로 표시됨");
    await expect(panel).toHaveTextContent("panel slot은 lifecycle state와 함께 유지됨");
    await expect(
      durationInMilliseconds(getComputedStyle(preview).animationDuration),
    ).toBeLessThanOrEqual(0.01);
    await expect(
      durationInMilliseconds(getComputedStyle(panel).animationDuration),
    ).toBeLessThanOrEqual(0.01);
  },
};
