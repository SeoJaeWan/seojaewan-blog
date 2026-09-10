import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import startMeta, { Default } from "./taskbarStart.stories.js";

/** 일반 Story의 실제 runtime을 그대로 사용해 full Start 제품 flow를 Chromium에서 검증한다. */
const meta = {
  ...startMeta,
  title: "Tests/Taskbar/Start",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractionTest: Story = {
  ...Default,
  name: "Start 전체 제품 흐름 자동 검사",
  play: async () => {
    const page = within(document.body);
    const button = page.getByRole("button", { name: "시작" });
    const outside = page.getByRole("button", { name: "패널 밖" });

    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByRole("dialog", { name: "시작" })).not.toHaveAttribute(
        "data-starting-style",
      ),
    );
    const input = page.getByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });
    await expect(button).toHaveFocus();
    await expect(input).not.toHaveFocus();
    await expect(button).toHaveAttribute("aria-expanded", "true");

    const initialItems = page.getAllByRole("gridcell");
    await expect(initialItems).toHaveLength(5);
    const first = initialItems[0];
    const destination = initialItems[2];
    if (first === undefined || destination === undefined) {
      throw new Error("Start drag fixture에는 첫 항목과 세 번째 항목이 필요합니다");
    }

    first.focus();
    await expect(first).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(page.getByRole("gridcell", { name: "Alpha 문서" })).toHaveFocus();

    const startRect = first.getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();
    await userEvent.pointer([
      {
        coords: { x: startRect.left + 8, y: startRect.top + 8 },
        keys: "[MouseLeft>]",
        target: first,
      },
      {
        coords: {
          x: destinationRect.left + destinationRect.width / 2,
          y: destinationRect.top + destinationRect.height / 2,
        },
        target: destination,
      },
      { keys: "[/MouseLeft]", target: destination },
    ]);
    await waitFor(() =>
      expect(page.getAllByRole("gridcell").map((item) => item.getAttribute("aria-label"))).toEqual([
        "Alpha 문서",
        "7zip",
        "프로젝트 폴더",
        "가나다 아주 긴 문서 제목으로 두 줄 표현 확인",
        "_Tool",
      ]),
    );

    await userEvent.click(page.getByRole("button", { name: "모두" }));
    await expect(page.getByRole("status", { name: "Start browse view" })).toHaveTextContent("all");
    await waitFor(() => expect(page.getByRole("region", { name: "모두" })).toBeVisible());
    await userEvent.click(page.getByRole("button", { name: "A 범주 인덱스 열기" }));
    await waitFor(() => expect(page.getByRole("dialog", { name: "범주 인덱스" })).toBeVisible());
    await userEvent.click(page.getByRole("button", { name: "7 범주로 이동" }));
    await waitFor(() => expect(page.queryByRole("dialog", { name: "범주 인덱스" })).toBeNull());
    await expect(page.getByRole("button", { name: "7zip" })).toBeVisible();

    await userEvent.click(input);
    await userEvent.type(input, "한글  query ");
    await expect(input).toHaveValue("한글  query ");
    await expect(page.getByRole("region", { name: "Start Search 후속 경계" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Start Search query" })).toHaveTextContent(
      "한글 query",
    );

    await userEvent.clear(input);
    await waitFor(() => expect(page.getByRole("region", { name: "모두" })).toBeVisible());
    await userEvent.click(page.getByRole("button", { name: "7zip" }));
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
    await expect(page.getByLabelText("마지막 open 결과")).toHaveTextContent(
      "external: https://example.com/7zip",
    );
    await expect(page.getByRole("status", { name: "시작 메뉴 검색어" })).toHaveTextContent(
      "(비어 있음)",
    );

    await userEvent.click(button);
    await waitFor(() =>
      expect(page.getByRole("dialog", { name: "시작" })).not.toHaveAttribute(
        "data-starting-style",
      ),
    );
    await expect(page.getByRole("status", { name: "Start browse view" })).toHaveTextContent(
      "pinned",
    );
    await expect(page.getAllByRole("gridcell").map((item) => item.getAttribute("aria-label"))).toEqual([
      "Alpha 문서",
      "7zip",
      "프로젝트 폴더",
      "가나다 아주 긴 문서 제목으로 두 줄 표현 확인",
      "_Tool",
    ]);
    await userEvent.click(outside);
    await waitFor(() => expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull());
  },
};
