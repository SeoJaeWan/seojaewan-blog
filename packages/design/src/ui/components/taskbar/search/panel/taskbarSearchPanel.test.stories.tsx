import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import searchPanelMeta, { Default } from "./taskbarSearchPanel.stories.js";

/** 일반 Search Story를 자동으로 닫지 않고 같은 fixture의 lifecycle을 browser에서 검증한다. */
const meta = {
  ...searchPanelMeta,
  title: "Tests/Taskbar/Search",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const LifecycleTest: Story = {
  ...Default,
  name: "Search panel 연결 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const input = canvas.getByRole("textbox", { name: "검색" });

    await userEvent.click(input);
    await expect(input).toHaveFocus();
    const panel = await page.findByRole("dialog", { name: "검색" });
    await waitFor(() => expect(panel).toBeVisible());
    await expect(page.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);

    await userEvent.type(input, "한글  검색 ");
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
