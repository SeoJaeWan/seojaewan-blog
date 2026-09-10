import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { WindowMode } from "../../../../headless/index.js";
import rootMeta, {
  Desktop,
  Mobile,
  MobileChromeActive,
  SearchDisabled,
  WindowsDisabled,
} from "./taskbarRoot.stories.js";

/** 실제 browser에서 Root 높이·viewport 폭·좁은 폭 overflow를 확인한다. */
const verifyRootGeometry = async (canvasElement: HTMLElement, mode: WindowMode) => {
  const taskbar = within(canvasElement).getByRole("navigation", { name: "작업 표시줄" });
  const bounds = taskbar.getBoundingClientRect();

  await expect(taskbar.getAttribute("data-mode")).toBe(mode);
  await expect(bounds.height).toBe(50);
  await expect(bounds.left).toBe(0);
  await expect(bounds.right).toBe(window.innerWidth);
  await expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);

  if (mode === "desktop") {
    const canvas = within(canvasElement);
    const windowsBounds = canvas.getByRole("button", { name: "시작" }).getBoundingClientRect();
    const searchBounds = canvas.getByRole("textbox", { name: "검색" }).getBoundingClientRect();
    await expect(windowsBounds.width).toBe(40);
    await expect(windowsBounds.height).toBe(40);
    await expect(searchBounds.width).toBe(220);
    await expect(searchBounds.height).toBe(30);
    await expect(searchBounds.left - windowsBounds.right).toBe(12);
    await expect(
      canvasElement.querySelector('[data-taskbar-region="desktop-applications"]'),
    ).not.toBeNull();
    await expect(canvas.queryByRole("button", { name: "파일 탐색기" })).toBeNull();
  } else {
    const canvas = within(canvasElement);
    const fileExplorer = canvas.getByRole("button", { name: "파일 탐색기" });
    const chrome = canvas.getByRole("button", { name: "Chrome" });
    const fileExplorerBounds = fileExplorer.getBoundingClientRect();
    const chromeBounds = chrome.getBoundingClientRect();
    await expect(fileExplorerBounds.width).toBe(40);
    await expect(fileExplorerBounds.height).toBe(40);
    await expect(chromeBounds.width).toBe(40);
    await expect(chromeBounds.height).toBe(40);
    await expect(chromeBounds.left - fileExplorerBounds.right).toBe(12);
    await expect(canvas.queryByRole("button", { name: "시작" })).toBeNull();
    await expect(canvas.queryByRole("textbox", { name: "검색" })).toBeNull();
  }

  const timestamp = within(canvasElement).getByText("15:24").parentElement;
  const timestampBounds = timestamp?.getBoundingClientRect();
  await expect(timestamp).not.toBeNull();
  await expect(timestampBounds?.height).toBeGreaterThan(0);
  await expect(timestampBounds?.height).toBeLessThanOrEqual(bounds.height);
  await expect(timestampBounds?.right).toBe(window.innerWidth - 24);
  await expect(within(canvasElement).getByText("2026-07-10")).toBeVisible();
};

/** 일반 Root Story의 시작 상태를 바꾸지 않고 mode별 browser 동작을 검증한다. */
const meta = {
  ...rootMeta,
  title: "Tests/Taskbar/Root",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesktopTest: Story = {
  ...Desktop,
  name: "데스크톱 panel 전환 자동 검사",
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "desktop");
    const canvas = within(canvasElement);
    const page = within(document.body);
    const start = canvas.getByRole("button", { name: "시작" });
    const search = canvas.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    const activePanel = canvas.getByRole("status", { name: "활성 패널" });

    await userEvent.click(start);
    await waitFor(() => expect(activePanel).toHaveTextContent("start"));
    await waitFor(() => expect(page.getByRole("dialog", { name: "시작" })).toBeVisible());
    await expect(page.getByRole("textbox", { name: "앱 및 문서 검색" })).toBeVisible();

    await userEvent.click(search);
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
    await expect(page.queryByRole("dialog", { name: "검색" })).toBeNull();
    await waitFor(() => expect(activePanel).toHaveTextContent("search"));
    await waitFor(() => expect(page.getByRole("dialog", { name: "검색" })).toBeVisible());
    await userEvent.type(search, "한글  검색 ");
    await expect(search).toHaveValue("한글  검색 ");
    await expect(canvas.getByRole("status", { name: "Search 검색어" }).textContent).toBe(
      "한글  검색 ",
    );

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
    await waitFor(() => expect(search).toHaveValue(""));
    await expect(search).not.toHaveFocus();

    await userEvent.click(search);
    await waitFor(() => expect(activePanel).toHaveTextContent("search"));
    await userEvent.click(canvas.getByRole("button", { name: "패널 밖" }));
    await waitFor(() => expect(activePanel).toHaveTextContent("없음"));
  },
};

export const WindowsDisabledTest: Story = {
  ...WindowsDisabled,
  name: "시작 사용 불가 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("없음");
  },
};

export const SearchDisabledTest: Story = {
  ...SearchDisabled,
  name: "검색 사용 불가 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "검색" }));
    await expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("없음");
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "활성 패널" })).toHaveTextContent("start"),
    );
  },
};

export const MobileTest: Story = {
  ...Mobile,
  name: "모바일 실행 입력 자동 검사",
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "mobile");
    const canvas = within(canvasElement);
    const fileExplorer = canvas.getByRole("button", { name: "파일 탐색기" });
    const chrome = canvas.getByRole("button", { name: "Chrome" });

    await userEvent.click(fileExplorer);
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("file-explorer");

    await userEvent.tab();
    await expect(chrome).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("2");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("chrome");

    await userEvent.tab({ shift: true });
    await expect(fileExplorer).toHaveFocus();
    await expect(getComputedStyle(fileExplorer).boxShadow).not.toBe("none");
    await userEvent.keyboard(" ");
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("3");
  },
};

export const MobileChromeActiveTest: Story = {
  ...MobileChromeActive,
  name: "모바일 활성 앱 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("button", { name: "Chrome" });
    await expect(chrome).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chrome);
    await expect(canvas.getByRole("status", { name: "Mobile Action 횟수" })).toHaveTextContent("1");
    await expect(
      canvas.getByRole("status", { name: "마지막 Mobile application" }),
    ).toHaveTextContent("chrome");
  },
};
