import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import startMeta, { Default } from "./taskbarStart.stories.js";

/** 일반 Story의 시작 상태를 바꾸지 않고 Start panel lifecycle을 browser에서 검증한다. */
const meta = {
  ...startMeta,
  title: "Tests/Taskbar/Start",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractionTest: Story = {
  ...Default,
  name: "Start 입력과 닫힘 자동 검사",
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
    const icon = input.parentElement?.querySelector(".taskbar-search__icon");
    await expect(icon).not.toBeNull();
    await waitFor(() => expect(getComputedStyle(icon as Element, "::after").opacity).toBe("1"));
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
