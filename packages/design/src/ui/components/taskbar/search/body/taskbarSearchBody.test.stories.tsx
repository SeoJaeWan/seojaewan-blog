import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

import resourceMeta, { ProductReference } from "./taskbarSearchBody.stories.js";

const meta = {
  ...resourceMeta,
  title: "Tests/Taskbar/SearchResults",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** 실제 Search input으로 진입하고 첫 검색 결과가 확정될 때까지 기다린다. */
const openSearch = async () => {
  const page = within(document.body);
  const input = await page.findByRole<HTMLInputElement>("textbox", { name: "검색" });
  await userEvent.click(input);
  await userEvent.paste("검색");
  await waitFor(() =>
    expect(document.querySelector(".taskbar-search-body")).not.toHaveAttribute("data-pending"),
  );
  await waitFor(() => expect(page.getByRole("heading", { name: "최고의 일치" })).toBeVisible());
  return { page, input };
};

export const InputAndDetail: Story = {
  ...ProductReference,
  name: "입력·조합·탐색·상세 자동 검사",
  play: async () => {
    const { page, input } = await openSearch();
    const list = page.getByRole("region", { name: "최고의 일치" }).querySelector("ul")!;
    await expect(list.children).toHaveLength(32);
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    await expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("0");
    await userEvent.keyboard("{ArrowDown}");
    await expect(list.querySelector("button")).toHaveFocus();
    await expect(page.queryByRole("region", { name: "검색 항목 상세" })).toBeNull();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}");
    await expect(list.querySelector("button")).toHaveFocus();
    const opener = page.getAllByRole("button", { name: /자세히$/ })[0];
    const beforeScroll = list.scrollTop;
    await userEvent.click(opener);
    await expect(page.getByRole("region", { name: "검색 항목 상세" })).toBeVisible();
    await expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("0");
    await userEvent.click(page.getByRole("button", { name: "뒤로" }));
    await expect(opener).toHaveFocus();
    await expect(list.scrollTop).toBe(beforeScroll);
    await expect(input).toHaveValue("검색");
    await userEvent.click(opener);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.paste(" React  상태 ");
    await expect(input).toHaveValue(" React  상태 ");
    await expect(page.queryByRole("region", { name: "검색 항목 상세" })).toBeNull();
    await expect(list.children).toHaveLength(32);
    await fireEvent.click(list.querySelector("button")!);
    await fireEvent.keyDown(input, { key: "Enter" });
    await expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("0");
    await fireEvent.compositionStart(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.paste("검색");
    await fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
    await new Promise((resolve) => setTimeout(resolve, 180));
    await expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("0");
    await expect(document.querySelector(".taskbar-search-body")).toHaveAttribute(
      "data-pending",
      "true",
    );
    await fireEvent.compositionEnd(input, { data: "검색" });
    await waitFor(() =>
      expect(document.querySelector(".taskbar-search-body")).not.toHaveAttribute("data-pending"),
    );
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("1"),
    );
    await waitFor(() => expect(input).toHaveValue(""), { timeout: 1500 });
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2");
    await userEvent.click(input);
    await waitFor(() => expect(page.getByRole("region", { name: "추천" })).toBeVisible());
    await expect(page.getByRole("region", { name: "추천" }).querySelectorAll("li")).toHaveLength(6);
    await expect(page.getByRole("region", { name: "추천" }).clientWidth).toBeGreaterThan(
      page.getByRole("region", { name: "최근 항목" }).clientWidth,
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog", { name: "검색" })).toBeNull());
    await expect(input).not.toHaveFocus();
  },
};

export const SaveFailureAndLocation: Story = {
  ...ProductReference,
  name: "저장 실패·파일 위치·독립 입력 자동 검사",
  args: { saveReject: true },
  play: async () => {
    const { page, input } = await openSearch();
    await userEvent.click(page.getAllByRole("button", { name: /자세히$/ })[0]);
    await userEvent.click(page.getByRole("button", { name: "파일 위치 열기" }));
    await waitFor(() => expect(input).toHaveValue(""), { timeout: 1500 });
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2");
    await userEvent.click(input);
    await waitFor(() => expect(page.getByRole("region", { name: "최근 항목" })).toBeVisible());
    await expect(
      within(page.getByRole("region", { name: "최근 항목" })).getByRole("button", {
        name: "검색 폴더의 아주 긴 이름과 표시 경로 확인",
      }),
    ).toBeVisible();
    await userEvent.paste("보존 검색어");
    await userEvent.click(page.getByRole("button", { name: "시작" }));
    const startInput = await page.findByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });
    await waitFor(() => expect(page.getByRole("dialog", { name: "시작" })).toBeVisible());
    await expect(startInput).toHaveValue("");
    await userEvent.click(startInput);
    await userEvent.paste("  ");
    await waitFor(() => expect(page.getByRole("heading", { name: "고정됨" })).toBeVisible());
    await userEvent.paste("검색");
    await waitFor(() => expect(page.getByRole("heading", { name: "최고의 일치" })).toBeVisible());
    await userEvent.click(page.getAllByRole("button", { name: /자세히$/ })[0]);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog", { name: "시작" })).toBeNull());
    await userEvent.click(input);
    await waitFor(() => expect(input).toHaveValue(""), { timeout: 1500 });
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2");
    await expect(page.queryByRole("alert")).toBeNull();
  },
};

export const OpenFailure: Story = {
  ...ProductReference,
  name: "열기 실패 보존 자동 검사",
  args: { fail: true },
  play: async () => {
    const { page, input } = await openSearch();
    await userEvent.click(page.getAllByRole("button", { name: /자세히$/ })[0]);
    await userEvent.click(page.getByRole("button", { name: "파일 열기" }));
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("1"),
    );
    await expect(input).toHaveValue("검색");
    await expect(page.getByRole("region", { name: "검색 항목 상세" })).toBeVisible();
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("1");
    await expect(page.queryByRole("alert")).toBeNull();
  },
};

export const LateOpenAndMobile: Story = {
  ...ProductReference,
  name: "늦은 열기·새 activation·모바일 자동 검사",
  args: { deferred: true },
  play: async () => {
    const { page, input } = await openSearch();
    await userEvent.click(
      page.getByRole("region", { name: "최고의 일치" }).querySelector("button")!,
    );
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("1"),
    );
    await expect(page.getByRole("dialog", { name: "검색" })).toBeVisible();
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("1");
    await userEvent.click(input);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(input).toHaveValue(""), { timeout: 1500 });
    await userEvent.click(input);
    await userEvent.paste("새 입력");
    await fireEvent.click(page.getByRole("button", { name: "대기 중 열기 완료" }));
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2"),
    );
    await expect(input).toHaveValue("새 입력");
    await waitFor(() => expect(page.getByRole("dialog", { name: "검색" })).toBeVisible());
    await expect(page.getByRole("status", { name: "활성 검색 패널" })).toHaveTextContent("search");
    await userEvent.click(page.getByRole("button", { name: "모바일로 전환" }));
    await waitFor(() => expect(page.queryByRole("textbox", { name: "검색" })).toBeNull());
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2");
  },
};

/** 각 production input을 통해 같은 결과·detail 흐름에 진입한다. */
const openPanelSearch = async (panel: "start" | "search") => {
  if (panel === "search") return openSearch();
  const page = within(document.body);
  await userEvent.click(await page.findByRole("button", { name: "시작" }));
  const input = await page.findByRole<HTMLInputElement>("textbox", { name: "앱 및 문서 검색" });
  await userEvent.click(input);
  await userEvent.paste("검색");
  await waitFor(() => expect(page.getByRole("heading", { name: "최고의 일치" })).toBeVisible());
  return { page, input };
};

export const CloseCompletionContract: Story = {
  ...ProductReference,
  name: "두 Surface 실제 close 완료 시 transient 초기화 계약",
  play: async () => {
    for (const panel of ["search", "start"] as const) {
      const { page, input } = await openPanelSearch(panel);
      const state = page.getByRole("status", {
        name: panel === "start" ? "시작 검색 상태" : "독립 검색 상태",
      });
      await userEvent.click(page.getAllByRole("button", { name: /자세히$/ })[0]);
      await expect(page.getByRole("region", { name: "검색 항목 상세" })).toBeVisible();
      await expect(input).toHaveValue("검색");
      await expect(state).not.toHaveTextContent("detail=none");
      await userEvent.click(page.getByRole("button", { name: "파일 열기" }));
      await waitFor(() =>
        expect(document.querySelector(".taskbar-panel-widget__popup")).toBeNull(),
      );
      // timeout·watchdog 대신 실제 Popup 종료 직후 owner의 query/detail 초기화를 관찰한다.
      await expect(state).toHaveTextContent("query=;detail=none");
      await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2");
    }
  },
};

export const ReducedMotionCloseCompletion: Story = {
  ...CloseCompletionContract,
  name: "두 Surface 0 duration 실제 close 완료 계약",
  args: { reducedMotion: true },
};

export const StartOpenFailure: Story = {
  ...ProductReference,
  name: "Start 검색 열기 실패 보존 계약",
  args: { fail: true },
  play: async () => {
    const { page, input } = await openPanelSearch("start");
    await userEvent.click(page.getAllByRole("button", { name: /자세히$/ })[0]);
    await userEvent.click(page.getByRole("button", { name: "파일 열기" }));
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("1"),
    );
    await expect(input).toHaveValue("검색");
    await expect(page.getByRole("region", { name: "검색 항목 상세" })).toBeVisible();
    await expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("1");
  },
};

export const StartLateOpen: Story = {
  ...ProductReference,
  name: "Start 늦은 성공은 현재 Search activation 보존",
  args: { deferred: true },
  play: async () => {
    const { page } = await openPanelSearch("start");
    await userEvent.click(
      page.getByRole("region", { name: "최고의 일치" }).querySelector("button")!,
    );
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 open 횟수" })).toHaveTextContent("1"),
    );
    const input = page.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    await userEvent.click(input);
    await waitFor(() => expect(page.getByRole("dialog", { name: "검색" })).toBeVisible());
    await userEvent.paste("새 입력");
    await fireEvent.click(page.getByRole("button", { name: "대기 중 열기 완료" }));
    await waitFor(() =>
      expect(page.getByRole("status", { name: "검색 recent 개수" })).toHaveTextContent("2"),
    );
    await expect(input).toHaveValue("새 입력");
    await expect(page.getByRole("dialog", { name: "검색" })).toBeVisible();
    await expect(page.getByRole("status", { name: "활성 검색 패널" })).toHaveTextContent("search");
  },
};
