import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import allMeta, { Default } from "./taskbarStartAll.stories.js";

/** 일반 Story의 상태를 보존하며 All/Index 실제 Chromium interaction을 검증한다. */
const meta = {
  ...allMeta,
  title: "Tests/Taskbar/Start/All",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const KeyboardFocusAndScrollTest: Story = {
  ...Default,
  name: "All index keyboard·focus·scroll 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole("button", { name: "A 범주 인덱스 열기" });
    await userEvent.click(opener);

    const dialog = canvas.getByRole("dialog", { name: "범주 인덱스" });
    const alpha = canvas.getByRole("button", { name: "A 범주로 이동" });
    await waitFor(() => expect(alpha).toHaveFocus());
    const grid = dialog.querySelector<HTMLElement>(".taskbar-start-all__index-grid");
    const list = canvas.getByLabelText("모든 앱과 문서");
    if (grid === null) throw new Error("4열 category grid가 렌더링되어야 합니다");
    await expect(dialog.querySelectorAll("[data-start-index-category]")).toHaveLength(9);
    await expect(canvas.queryByRole("button", { name: "F 범주로 이동" })).toBeNull();
    await expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(4);
    await expect(getComputedStyle(grid).columnGap).toBe("8px");
    await expect(getComputedStyle(alpha).fontSize).toBe("20px");
    await expect(getComputedStyle(dialog).transitionDuration.startsWith("0.5s, 0.5s")).toBe(true);
    await expect(getComputedStyle(list).transitionDuration.startsWith("0.5s, 0.5s")).toBe(true);
    await expect(getComputedStyle(list).paddingInlineStart).toBe("16px");
    await expect(getComputedStyle(dialog).overflowY).toBe("hidden");
    await waitFor(() => expect(getComputedStyle(dialog).overflowY).toBe("auto"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "B 범주로 이동" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    await expect(dialog).toHaveAttribute("aria-hidden", "true");

    await expect(list.scrollTop).toBe(0);
    await userEvent.click(opener);
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "A 범주로 이동" })).toHaveFocus(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "# 범주로 이동" }));
    const symbolHeading = canvas.getByRole("button", { name: "# 범주 인덱스 열기" });
    await waitFor(() => expect(symbolHeading).toHaveFocus());
    await waitFor(() => expect(list.scrollTop).toBeGreaterThan(0));
    await expect(getComputedStyle(list).overflowY).toBe("hidden");
    await waitFor(() => expect(getComputedStyle(list).overflowY).toBe("auto"));

    const shortcut = canvas.getByRole("button", { name: "_Tool" });
    await expect(shortcut).not.toBeDisabled();
    await expect(getComputedStyle(shortcut).fontSize).toBe("14px");
    await expect(getComputedStyle(shortcut).columnGap).toBe("16px");
    await expect(getComputedStyle(shortcut).paddingBlockStart).toBe("10px");
    await userEvent.click(shortcut);
    await expect(canvas.getByRole("status", { name: "선택한 항목" })).toHaveTextContent(
      "external-shortcut:_Tool",
    );
  },
};
