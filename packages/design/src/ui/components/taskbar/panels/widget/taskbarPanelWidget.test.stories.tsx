import { useRef, useState } from "react";

import { Popover } from "@base-ui/react/popover";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { TaskbarPanelOpenChangeReason, TaskbarPanelWidgetVariant } from "./index.js";
import { TaskbarPanelWidget } from "./index.js";

/** Panel 안에서 연 portal도 parent panel 내부 interaction으로 판정하는 실제 Base UI 조합이다. */
const NestedPortal = () => (
  <Popover.Root>
    <Popover.Trigger>내부 메뉴 열기</Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner sideOffset={4}>
        <Popover.Popup
          aria-label="내부 메뉴"
          style={{ background: "white", border: "1px solid #d6d9e0", padding: 12 }}
        >
          <button type="button">내부 동작</button>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
);

/** 실제 trigger, controlled state와 관찰 결과를 결합한 제품 widget fixture다. */
const PanelFixture = ({
  initialOpen = false,
  nestedPortal = false,
  reducedMotion = false,
  variant,
}: {
  initialOpen?: boolean;
  nestedPortal?: boolean;
  reducedMotion?: boolean;
  variant: TaskbarPanelWidgetVariant;
}) => {
  const [open, setOpen] = useState(initialOpen);
  const [reason, setReason] = useState<TaskbarPanelOpenChangeReason | "none">("none");
  const [transition, setTransition] = useState("none");
  const [transitionHistory, setTransitionHistory] = useState<readonly string[]>([]);
  const transitionStartedAt = useRef(initialOpen ? performance.now() : null);

  /** 실제 browser transition callback까지 걸린 시간을 관찰 상태에 함께 남긴다. */
  const recordTransition = (kind: "cancel" | "complete", nextOpen: boolean) => {
    const startedAt = transitionStartedAt.current;
    const elapsed =
      startedAt === null ? "initial" : `${Math.round(performance.now() - startedAt)}ms`;
    transitionStartedAt.current = null;
    const event = `${kind}:${String(nextOpen)}:${elapsed}`;
    setTransition(event);
    setTransitionHistory((current) => [...current, event]);
  };

  return (
    <div
      lang="ko-KR"
      style={{
        background: "linear-gradient(135deg, #c9def4, #eef4f8)",
        minHeight: "100vh",
      }}
    >
      {reducedMotion ? (
        <style>{`.taskbar-panel-widget__popup { transition-duration: 0s !important; }`}</style>
      ) : null}
      <button style={{ left: 16, position: "fixed", top: 16 }} type="button">
        패널 밖
      </button>
      <nav
        aria-label="작업 표시줄"
        style={{
          alignItems: "center",
          backdropFilter: "blur(18px)",
          background: "rgb(255 255 255 / 80%)",
          bottom: 0,
          display: "flex",
          gap: 12,
          height: 50,
          justifyContent: "center",
          left: 0,
          position: "fixed",
          right: 0,
          zIndex: 2147483647,
        }}
      >
        <TaskbarPanelWidget
          open={open}
          trigger={
            variant === "start" ? (
              <button
                aria-label="시작"
                className="taskbar-start-button"
                data-selected={open ? "true" : undefined}
                style={{ height: 40, width: 40 }}
                type="button"
              />
            ) : (
              <input
                aria-label="검색"
                className="taskbar-search"
                readOnly
                style={{ height: 30, width: 220 }}
                type="text"
                value=""
              />
            )
          }
          variant={variant}
          onOpenChange={(nextOpen, nextReason) => {
            transitionStartedAt.current = performance.now();
            setReason(nextReason);
            setOpen(nextOpen);
          }}
          onTransitionCancel={(nextOpen) => recordTransition("cancel", nextOpen)}
          onTransitionComplete={(nextOpen) => recordTransition("complete", nextOpen)}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <strong>{variant === "start" ? "Start panel" : "Search panel"}</strong>
            <span>본문은 HDJG-46·47에서 연결합니다.</span>
            {nestedPortal ? <NestedPortal /> : null}
          </div>
        </TaskbarPanelWidget>
      </nav>
      <div aria-label="widget 상태" role="status" style={{ position: "fixed", right: 16, top: 16 }}>
        {open ? "open" : "closed"};{reason};{transition}
      </div>
      <output aria-label="transition 이력" hidden>
        {transitionHistory.join(",") || "none"}
      </output>
    </div>
  );
};

/** portal에 렌더링된 panel을 문서 전체에서 찾는다. */
const getPanel = (name: "검색" | "시작") => within(document.body).getByRole("dialog", { name });

/** Start 또는 Search의 안정된 open geometry와 motion token을 확인한다. */
const verifyOpenGeometry = async (
  panel: HTMLElement,
  trigger: HTMLElement,
  variant: TaskbarPanelWidgetVariant,
) => {
  const panelBounds = panel.getBoundingClientRect();
  const triggerBounds = trigger.getBoundingClientRect();

  await expect(getComputedStyle(panel).transitionDuration).toBe("0.22s");
  await expect(panelBounds.top).toBeGreaterThanOrEqual(0);
  await expect(panelBounds.bottom).toBeLessThanOrEqual(triggerBounds.top);
  await expect(panelBounds.height).toBeLessThanOrEqual(600);

  if (variant === "start") {
    await expect(
      Math.abs(panelBounds.left + panelBounds.width / 2 - window.innerWidth / 2),
    ).toBeLessThan(1);
  } else {
    await expect(Math.abs(panelBounds.left - triggerBounds.left)).toBeLessThan(1);
  }
};

const meta = {
  title: "Tests/Taskbar/Panel Widget",
  component: TaskbarPanelWidget,
  tags: ["!autodocs", "!dev"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Start와 Search의 controlled open 상태를 Base UI Popover에 직접 연결하는 제품 Component다. trigger/content 관계, viewport 배치, portal, focus·Escape·outside dismiss, presence와 220/200ms motion을 소유한다. active panel identity와 순차 switch는 headless가 담당한다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
  args: {
    children: null,
    onOpenChange: () => undefined,
    open: false,
    trigger: <button type="button">trigger</button>,
    variant: "start",
  },
} satisfies Meta<typeof TaskbarPanelWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StartOpen: Story = {
  name: "Start 열린 상태",
  render: () => <PanelFixture initialOpen variant="start" />,
  play: async () => {
    const panel = getPanel("시작");
    const trigger = within(document.body).getByRole("button", { name: "시작" });
    await waitFor(() => expect(panel).not.toHaveAttribute("data-starting-style"));
    await verifyOpenGeometry(panel, trigger, "start");
  },
};

export const SearchOpen: Story = {
  name: "Search 열린 상태",
  render: () => <PanelFixture initialOpen variant="search" />,
  play: async () => {
    const panel = getPanel("검색");
    const trigger = within(document.body).getByRole("textbox", { name: "검색" });
    await waitFor(() => expect(panel).not.toHaveAttribute("data-starting-style"));
    await verifyOpenGeometry(panel, trigger, "search");
  },
};

export const DismissAndPresence: Story = {
  name: "외부 dismiss와 exit presence",
  render: () => <PanelFixture variant="start" />,
  play: async () => {
    const page = within(document.body);
    const trigger = page.getByRole("button", { name: "시작" });
    await userEvent.click(trigger);
    const panel = getPanel("시작");
    await waitFor(() =>
      expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
        "open;trigger;complete:true",
      ),
    );

    await userEvent.click(page.getByRole("button", { name: "패널 밖" }));
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect(panel).toHaveAttribute("inert");
    await expect(panel).toHaveAttribute("data-ending-style");
    await expect(getComputedStyle(panel).pointerEvents).toBe("none");
    await expect(getComputedStyle(panel).transitionDuration).toBe("0.2s");
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
      "closed;outside;complete:false",
    );
  },
};

export const NestedPortalInteraction: Story = {
  name: "내부 portal 유지",
  render: () => <PanelFixture initialOpen nestedPortal variant="start" />,
  play: async () => {
    const page = within(document.body);
    const panel = getPanel("시작");
    await waitFor(() =>
      expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
        "open;none;complete:true",
      ),
    );
    await userEvent.click(page.getByRole("button", { name: "내부 메뉴 열기" }));
    await expect(page.getByRole("dialog", { name: "내부 메뉴" })).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "내부 동작" }));
    await expect(panel).toBeVisible();
    await expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent("open");
  },
};

export const SearchEscape: Story = {
  name: "Search Escape focus 해제",
  render: () => <PanelFixture variant="search" />,
  play: async () => {
    const page = within(document.body);
    const input = page.getByRole("textbox", { name: "검색" });
    await userEvent.click(input);
    await expect(input).toHaveFocus();
    await waitFor(() =>
      expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
        "open;trigger;complete:true",
      ),
    );
    await userEvent.keyboard("{Escape}");
    await expect(input).not.toHaveFocus();
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(input).not.toHaveFocus();
    await expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
      "closed;escape;complete:false",
    );
  },
};

export const MotionObservation: Story = {
  name: "motion 관찰",
  render: () => <PanelFixture variant="start" />,
};

export const ReducedMotion: Story = {
  name: "reduced motion 최종 상태",
  render: () => <PanelFixture reducedMotion variant="start" />,
  play: async () => {
    const page = within(document.body);
    const trigger = page.getByRole("button", { name: "시작" });
    await userEvent.click(trigger);
    const panel = getPanel("시작");
    await expect(getComputedStyle(panel).transitionDuration).toBe("0s");
    await waitFor(() =>
      expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
        "open;trigger;complete:true",
      ),
    );
    await expect(panel).not.toHaveAttribute("data-starting-style");

    await userEvent.click(page.getByRole("button", { name: "패널 밖" }));
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
      "closed;outside;complete:false",
    );
  },
};

export const InterruptedTransition: Story = {
  name: "중단된 transition의 늦은 완료 차단",
  render: () => <PanelFixture variant="start" />,
  play: async () => {
    const page = within(document.body);
    const trigger = page.getByRole("button", { name: "시작" });
    await userEvent.click(trigger);
    const panel = getPanel("시작");
    await new Promise((resolve) => setTimeout(resolve, 60));
    await userEvent.click(trigger);
    await expect(panel).toHaveAttribute("data-ending-style");
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect(panel).toHaveAttribute("inert");
    await expect(page.getByLabelText("transition 이력")).toHaveTextContent("cancel:true");
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(page.getByRole("status", { name: "widget 상태" })).toHaveTextContent(
      "closed;trigger;complete:false",
    );
  },
};
