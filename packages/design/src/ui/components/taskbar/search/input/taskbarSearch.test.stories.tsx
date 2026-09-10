import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import searchMeta, { Default, Pressed } from "./taskbarSearch.stories.js";

/** 일반 상태 Story를 유지하면서 검색 입력의 browser 동작을 검증한다. */
const meta = {
  ...searchMeta,
  title: "Tests/Taskbar/Search Input",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PressedVisualTest: Story = {
  ...Pressed,
  name: "누름 상태 아이콘 자동 검사",
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector(".taskbar-search__icon");
    await expect(icon).toHaveStyle({ transform: "none" });
  },
};

export const InteractionTest: Story = {
  ...Default,
  name: "입력 흐름 자동 검사",
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
