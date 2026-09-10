import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

import pinnedMeta, { Default } from "./taskbarStartPinned.stories.js";

/** 일반 Story를 바꾸지 않고 Chromium keyboard, focus, drag와 geometry를 검증한다. */
const meta = {
  ...pinnedMeta,
  title: "Tests/Taskbar/Start/Pinned",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractionTest: Story = {
  ...Default,
  name: "Pinned keyboard와 drag 자동 검사",
  play: async () => {
    const page = within(document.body);
    const grid = page.getByRole("grid", { name: "고정된 항목" });
    const initialItems = page.getAllByRole("gridcell");
    await expect(grid).toHaveAttribute("aria-colcount", "6");
    await expect(initialItems).toHaveLength(8);

    const gridStyle = getComputedStyle(grid);
    await expect(gridStyle.gridTemplateColumns.split(" ")).toHaveLength(6);
    const firstStyle = getComputedStyle(initialItems[0]);
    const icon = initialItems[0].querySelector(".taskbar-start-pinned__icon");
    const label = initialItems[1].querySelector(".taskbar-start-pinned__label");
    await expect(firstStyle.paddingTop).toBe("8px");
    await expect(firstStyle.paddingLeft).toBe("12px");
    await expect(getComputedStyle(icon as Element).width).toBe("34px");
    await expect(getComputedStyle(label as Element).fontSize).toBe("12px");
    await expect(firstStyle.transitionDuration).toContain("0.15s");

    await userEvent.click(initialItems[0]);
    await userEvent.keyboard("{ArrowDown}");
    await expect(page.getByRole("gridcell", { name: "키보드 탐색" })).toHaveFocus();
    await userEvent.keyboard("{Control>}{Home}{/Control}");
    await expect(initialItems[0]).toHaveFocus();

    const destination = initialItems[2];
    const startRect = initialItems[0].getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();
    await userEvent.pointer([
      {
        coords: { x: startRect.left + 8, y: startRect.top + 8 },
        keys: "[MouseLeft>]",
        target: initialItems[0],
      },
      {
        coords: {
          x: destinationRect.left + destinationRect.width / 2,
          y: destinationRect.top + destinationRect.height / 2,
        },
        target: destination,
      },
    ]);
    await waitFor(() => expect(initialItems[1].dataset.dragPreview).toBe("true"));
    await expect(initialItems[1].style.transform).toMatch(/^translate\(-/u);
    await expect(initialItems[2].style.transform).toMatch(/^translate\(-/u);
    await expect(page.getByRole("status", { name: "마지막 Start Action" })).toHaveTextContent(
      "없음",
    );
    await fireEvent.pointerUp(window, {
      clientX: destinationRect.left + destinationRect.width / 2,
      clientY: destinationRect.top + destinationRect.height / 2,
      pointerId: 1,
    });

    await waitFor(() =>
      expect(page.getByRole("status", { name: "마지막 Start Action" }).textContent).toContain(
        "folder → 3번째",
      ),
    );
    await waitFor(async () => {
      const labels = page.getAllByRole("gridcell").map((item) => item.getAttribute("aria-label"));
      await expect(labels.slice(0, 3)).toEqual([
        "디자인 시스템을 오래 유지하기 위한 아주 긴 문서 제목",
        "OpenAI",
        "프로젝트 폴더",
      ]);
    });
    const moved = page.getByRole("gridcell", { name: "프로젝트 폴더" });
    await waitFor(() => expect(moved.style.transition).toContain("150ms"));
    await waitFor(() => expect(moved.style.transform).toBe(""), { timeout: 1_000 });
  },
};
