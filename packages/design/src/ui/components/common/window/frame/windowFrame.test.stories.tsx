import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import windowFrameMeta, {
  FocusLifecycleEdges,
  MotionGestureOverlap,
  MotionPresenceAndFocus,
  PointerGestures,
} from "./windowFrame.stories.js";

/**
 * 일반 Story를 자동으로 변경하지 않으면서 같은 fixture의 browser 동작을 검증한다.
 *
 * test 전용 Story는 일반 sidebar와 Docs에서 숨긴다.
 */
const meta = {
  ...windowFrameMeta,
  title: "Tests/Common Window/Frame",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PointerGesturesTest: Story = {
  ...PointerGestures,
  name: "창 이동과 크기 조절 자동 검사",
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", {
      name: "Chrome 이동·크기 조절 창",
    });
    const original = { left: 120, top: 28, width: 720, height: 520 };
    const directions = ["n", "s", "w", "e", "nw", "ne", "sw", "se"] as const;

    for (const direction of directions) {
      const handle = frame.querySelector<HTMLElement>(
        '[data-direction="' + direction + '"]',
      )!;
      const handleBounds = handle.getBoundingClientRect();
      const start = {
        clientX: handleBounds.left + handleBounds.width / 2,
        clientY: handleBounds.top + handleBounds.height / 2,
      };
      await userEvent.pointer({ keys: "[MouseLeft>]", target: handle, coords: start });
      await userEvent.pointer({
        target: handle,
        coords: { clientX: start.clientX + 20, clientY: start.clientY + 10 },
      });
      await waitFor(() => expect(frame.getAttribute("data-gesture-active")).toBe("true"));
      await waitFor(async () => {
        const resized = frame.getBoundingClientRect();
        await expect(
          resized.left !== original.left ||
            resized.top !== original.top ||
            resized.width !== original.width ||
            resized.height !== original.height,
        ).toBe(true);
      });
      await userEvent.keyboard("{Escape}");
      await waitFor(async () => {
        const restored = frame.getBoundingClientRect();
        await expect(restored.left).toBe(original.left);
        await expect(restored.top).toBe(original.top);
        await expect(restored.width).toBe(original.width);
        await expect(restored.height).toBe(original.height);
      });
      await userEvent.pointer({ keys: "[/MouseLeft]", target: handle, coords: start });
    }

    const dragRegion = frame.querySelector<HTMLElement>("[data-window-drag-region]")!;
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 40 },
    });
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: 240, clientY: 12 },
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 12 },
    });
    await waitFor(() => expect(frame.getBoundingClientRect().top).toBe(0));

    const address = within(frame).getByRole("textbox", { name: "검색어 또는 URL 입력" });
    await userEvent.dblClick(address);
    await expect(frame.getAttribute("data-maximized")).toBe("false");

    const activeTab = within(frame).getByRole("tab", { name: "Chrome 활성 탭" });
    await userEvent.dblClick(activeTab);
    await expect(frame.getAttribute("data-maximized")).toBe("false");

    await userEvent.dblClick(dragRegion);
    await waitFor(() => expect(frame.getAttribute("data-maximized")).toBe("true"));
    await userEvent.dblClick(dragRegion);
    await waitFor(() => expect(frame.getAttribute("data-maximized")).toBe("false"));
    await userEvent.dblClick(dragRegion);
    await waitFor(() => expect(frame.getAttribute("data-maximized")).toBe("true"));

    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 15 },
    });
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
    await waitFor(async () => {
      const restoredForDrag = frame.getBoundingClientRect();
      await expect(restoredForDrag.left).toBe(220);
      await expect(restoredForDrag.top).toBe(10);
      await expect(restoredForDrag.width).toBe(720);
      await expect(restoredForDrag.height).toBe(520);
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(async () => {
      await expect(frame.getAttribute("data-maximized")).toBe("true");
      await expect(frame.getBoundingClientRect().width).toBe(960);
      await expect(frame.getBoundingClientRect().height).toBe(590);
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
  },
};

export const MotionPresenceAndFocusTest: Story = {
  ...MotionPresenceAndFocus,
  name: "최소화·복원과 포커스 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome 동작 확인 창" });
    const explorer = canvas.getByRole("region", { name: "파일 탐색기 동작 확인 창" });
    const address = within(chrome).getByRole<HTMLInputElement>("textbox", {
      name: "검색어 또는 URL 입력",
    });
    const scrollContent = chrome.querySelector<HTMLElement>(".window-story-chrome-content");
    const taskbarButton = canvas.getByRole("button", { name: "Chrome 복원" });
    const taskbarIcon = taskbarButton.querySelector<HTMLElement>(
      ".taskbar-application-button__icon",
    );
    await waitFor(() => expect(taskbarIcon?.getBoundingClientRect().width).toBeGreaterThan(0));
    const initialIcon = taskbarIcon!.getBoundingClientRect();
    const initialChrome = chrome.getBoundingClientRect();
    const initialValue = address.value;
    address.focus();
    if (scrollContent !== null) scrollContent.scrollTop = 48;
    const preservedScrollTop = scrollContent?.scrollTop ?? 0;
    await expect(preservedScrollTop).toBeGreaterThan(0);

    const minimizeStartedAt = performance.now();
    await userEvent.click(within(chrome).getByRole("button", { name: "최소화" }));
    await waitFor(() =>
      expect(chrome.getAttribute("data-presentation-phase")).toBe("window-minimize"),
    );
    let minimizeAnimation: Animation | undefined;
    await waitFor(async () => {
      minimizeAnimation = chrome.getAnimations()[0];
      await expect(minimizeAnimation).toBeDefined();
    });
    if (minimizeAnimation === undefined) {
      throw new Error("150ms 최소화 애니메이션을 찾지 못했습니다.");
    }
    await expect(minimizeAnimation.effect?.getTiming().duration).toBe(150);
    const minimizeFrames = (minimizeAnimation.effect as KeyframeEffect).getKeyframes();
    await expect(String(minimizeFrames.at(-1)?.transform)).toContain(
      String(Math.round(initialIcon.left - initialChrome.left)),
    );
    await waitFor(() => expect(chrome.hidden).toBe(true), { timeout: 800 });
    await expect(chrome).not.toBeVisible();
    await expect(performance.now() - minimizeStartedAt).toBeGreaterThanOrEqual(100);
    await expect(chrome.hasAttribute("inert")).toBe(true);
    await expect(chrome.getAttribute("aria-hidden")).toBe("true");
    await expect(address.value).toBe(initialValue);
    await expect(scrollContent?.scrollTop).toBe(preservedScrollTop);
    await expect(document.activeElement).toBe(explorer);

    taskbarButton.style.transform = "translateX(-180px)";
    const shiftedIcon = taskbarIcon!.getBoundingClientRect();
    await expect(shiftedIcon.left).not.toBe(initialIcon.left);
    const restoreStartedAt = performance.now();
    await userEvent.click(taskbarButton);
    await waitFor(() => expect(chrome.hidden).toBe(false));
    await waitFor(() =>
      expect(chrome.getAttribute("data-presentation-phase")).toBe("window-restore"),
    );
    let restoreAnimation: Animation | undefined;
    await waitFor(async () => {
      restoreAnimation = chrome
        .getAnimations()
        .find((animation) => animation.effect?.getTiming().duration === 200);
      await expect(restoreAnimation).toBeDefined();
    });
    if (restoreAnimation === undefined) {
      throw new Error("200ms 복원 애니메이션을 찾지 못했습니다.");
    }
    const restoreFrames = (restoreAnimation.effect as KeyframeEffect).getKeyframes();
    await expect(String(restoreFrames[0]?.transform)).toContain(
      String(Math.round(shiftedIcon.left - initialChrome.left)),
    );
    await waitFor(() => expect(chrome.hasAttribute("data-presentation-phase")).toBe(false), {
      timeout: 900,
    });
    await expect(performance.now() - restoreStartedAt).toBeGreaterThanOrEqual(150);
    await expect(document.activeElement).toBe(address);
    await expect(address.value).toBe(initialValue);
    await expect(scrollContent?.scrollTop).toBe(preservedScrollTop);

    const stage = canvasElement.querySelector<HTMLElement>(".window-story-stage")!;
    const dragRegion = chrome.querySelector<HTMLElement>("[data-window-drag-region]")!;
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 40 },
    });
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: -480, clientY: 112 },
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: -480, clientY: 112 },
    });
    await waitFor(() => expect(chrome.getBoundingClientRect().left).toBe(-600));

    explorer.focus();
    await waitFor(() => expect(explorer.getAttribute("data-active")).toBe("true"));
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 10, clientY: 112 },
    });
    await waitFor(() => expect(chrome.getAttribute("data-active")).toBe("true"));
    await expect(stage.scrollLeft).toBe(0);
    await expect(stage.scrollTop).toBe(0);
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 10, clientY: 112 },
    });
  },
};

export const MotionGestureOverlapTest: Story = {
  ...MotionGestureOverlap,
  name: "애니메이션 도중 창 이동 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome 동작 확인 창" });
    await userEvent.click(within(chrome).getByRole("button", { name: "최대화" }));
    await waitFor(() =>
      expect(chrome.getAttribute("data-presentation-phase")).toBe("window-maximize"),
    );
    const boundsAnimation = chrome
      .getAnimations()
      .find((animation) => animation.effect?.getTiming().duration === 150);
    if (boundsAnimation === undefined) {
      throw new Error("진행 중인 150ms 창 크기 애니메이션을 찾지 못했습니다.");
    }
    await expect(boundsAnimation.playState).toBe("running");

    const dragRegion = chrome.querySelector<HTMLElement>("[data-window-drag-region]")!;
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 15 },
    });
    await waitFor(() => expect(boundsAnimation.playState).toBe("idle"));
    await waitFor(() => expect(chrome.hasAttribute("data-presentation-phase")).toBe(false));
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
    await waitFor(async () => {
      const dragged = chrome.getBoundingClientRect();
      await expect(dragged.left).toBe(220);
      await expect(dragged.top).toBe(10);
      await expect(dragged.width).toBe(720);
      await expect(dragged.height).toBe(520);
    });

    await userEvent.keyboard("{Escape}");
    await waitFor(async () => {
      await expect(chrome.getAttribute("data-maximized")).toBe("true");
      await expect(chrome.getBoundingClientRect().width).toBe(960);
      await expect(chrome.getBoundingClientRect().height).toBe(590);
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
  },
};

export const FocusLifecycleEdgesTest: Story = {
  ...FocusLifecycleEdges,
  name: "창을 닫거나 복원한 뒤 포커스 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome 동작 확인 창" });
    const explorer = canvas.getByRole("region", { name: "파일 탐색기 동작 확인 창" });
    within(chrome).getByRole("textbox", { name: "검색어 또는 URL 입력" }).focus();
    await userEvent.click(within(chrome).getByRole("button", { name: "최소화" }));
    await waitFor(() => expect(chrome.hidden).toBe(true), { timeout: 800 });
    await userEvent.click(canvas.getByRole("button", { name: "Chrome 주소창 제거" }));
    await userEvent.click(canvas.getByRole("button", { name: "Chrome 복원" }));
    await waitFor(() => expect(chrome.hidden).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(chrome));

    await userEvent.click(within(chrome).getByRole("button", { name: "닫기" }));
    let closeAnimation: Animation | undefined;
    await waitFor(async () => {
      closeAnimation = chrome
        .getAnimations()
        .find((animation) => animation.effect?.getTiming().duration === 150);
      await expect(closeAnimation).toBeDefined();
    });
    const closeFrames = (closeAnimation!.effect as KeyframeEffect).getKeyframes();
    await expect(closeFrames[0]?.transformOrigin).toBe("center center");
    await expect(closeFrames.at(-1)?.transformOrigin).toBe("center center");
    await expect(String(closeFrames.at(-1)?.transform)).toContain("scale(0.6)");
    await waitFor(
      () => expect(document.querySelector('[aria-label="Chrome 동작 확인 창"]')).toBeNull(),
      { timeout: 800 },
    );
    await expect(document.activeElement).toBe(explorer);

    await userEvent.click(within(explorer).getByRole("button", { name: "닫기" }));
    await waitFor(
      () =>
        expect(
          document.querySelector('[aria-label="파일 탐색기 동작 확인 창"]'),
        ).toBeNull(),
      { timeout: 800 },
    );
    await expect(document.activeElement).toBe(document.body);
    await expect(document.activeElement).not.toBe(
      canvas.getByRole("button", { name: "Chrome 복원" }),
    );
  },
};
