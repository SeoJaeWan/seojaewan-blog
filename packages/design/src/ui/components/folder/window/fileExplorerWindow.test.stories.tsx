import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import fileExplorerMeta, {
  Desktop,
  DetailsView,
  LongBreadcrumb,
  Mobile,
  OverflowTabs,
  SearchEmpty,
  SidebarContextAndInlineEdit,
  UnresolvedAddress,
} from "./fileExplorerWindow.stories.js";

const meta = {
  ...fileExplorerMeta,
  title: "Tests/Products/File Explorer/Window",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const actionLog = (canvasElement: HTMLElement) =>
  within(canvasElement).getByLabelText("File Explorer Action 기록");

export const ControllerConnectionsTest: Story = {
  ...Desktop,
  name: "tab·address·Sidebar·focus·view Action 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const log = actionLog(canvasElement);

    await userEvent.click(canvas.getByRole("tab", { name: "Archive" }));
    await waitFor(() => expect(log.textContent).toContain("activate-file-explorer-tab"));

    await userEvent.click(canvas.getByRole("group", { name: "주소" }));
    const address = canvas.getByRole("textbox", { name: "주소" });
    await userEvent.clear(address);
    await userEvent.type(address, "/Archive{Enter}");
    await waitFor(async () => {
      await expect(log.textContent).toContain("navigate-file-explorer");
      await expect(log.textContent).toContain(
        '"id":"72000000-0000-4000-8000-000000000005"',
      );
    });

    const search = canvas.getByRole("searchbox", { name: "현재 폴더 검색" });
    await userEvent.click(search);
    await userEvent.type(search, "x");
    await waitFor(() => expect(log.textContent).toContain("set-file-explorer-query"));

    await userEvent.click(canvas.getByRole("treeitem", { name: "Archive" }));
    await userEvent.click(canvas.getByRole("region", { name: "폴더 내용" }));
    await waitFor(() => expect(log.textContent).toContain("set-file-explorer-selection"));

    await userEvent.click(canvas.getByRole("button", { name: "자세히" }));
    await waitFor(() => expect(log.textContent).toContain("folder-view-settings.update"));
  },
};

export const ResponsiveMobileTest: Story = {
  ...Mobile,
  name: "mobile DOM projection 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("tablist", { name: "파일 탐색기 탭" })).toBeNull();
    await expect(canvas.queryByRole("complementary", { name: "폴더 사이드바" })).toBeNull();
    await expect(canvas.queryByRole("contentinfo", { name: "폴더 상태" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "새 탭" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "최소화" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "최대화" })).toBeNull();
    await expect(canvas.getByRole("button", { name: "닫기" })).toBeVisible();
    await expect(canvas.getByRole("searchbox", { name: "현재 폴더 검색" })).toBeVisible();
  },
};

export const OverflowTest: Story = {
  ...OverflowTabs,
  name: "tab overflow 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getByRole("tablist", { name: "파일 탐색기 탭" }).parentElement
      ?.parentElement;
    await waitFor(() => expect(tabs?.getAttribute("data-overflow")).toBe("true"));
    await expect(canvas.getByRole("button", { name: "이전 탭 보기" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "다음 탭 보기" }));
  },
};

export const LongBreadcrumbTest: Story = {
  ...LongBreadcrumb,
  name: "긴 breadcrumb 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const omitted = canvas.getByRole("button", { name: "생략된 상위 폴더" });
    await expect(omitted).toBeVisible();
  },
};

export const UnresolvedTest: Story = {
  ...UnresolvedAddress,
  name: "unresolved error 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tab", { name: "폴더를 찾을 수 없음" })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "주소" })).toHaveValue("/Missing/Archive");
    await expect(canvas.getByRole("alert")).toHaveTextContent("폴더를 찾을 수 없습니다.");
    await expect(canvas.getByRole("searchbox", { name: "현재 폴더 검색" })).toBeDisabled();
    await expect(canvas.queryByRole("contentinfo", { name: "폴더 상태" })).toBeNull();
  },
};

export const SearchEmptyTest: Story = {
  ...SearchEmpty,
  name: "search empty 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status", { name: "" })).toHaveTextContent(
      "검색 결과가 없습니다.",
    );
    await expect(canvas.getByRole("contentinfo", { name: "폴더 상태" })).toHaveTextContent(
      "검색 결과 0개",
    );
  },
};

export const SidebarContextInlineEditTest: Story = {
  ...SidebarContextAndInlineEdit,
  name: "Sidebar context·inline edit 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("treeitem", { name: "Seojaewan Blog" });
    await userEvent.pointer({ keys: "[MouseRight]", target: row });
    const menu = within(document.body).getByRole("menu", { name: "사이드바 메뉴" });
    await expect(menu).toBeVisible();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "이름 바꾸기" }));
    const input = canvas.getByRole("textbox", { name: "폴더 이름 바꾸기" });
    await expect(input).toHaveValue("Seojaewan Blog");
    await userEvent.keyboard("{Escape}");
  },
};

export const SidebarPointerResizeTest: Story = {
  ...Desktop,
  name: "Sidebar pointer resize 자동 검사",
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector<HTMLElement>("[data-sidebar-resize-handle]");
    if (handle === null) throw new Error("Sidebar resize handle을 찾지 못했습니다.");
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: handle,
      coords: { clientX: 240, clientY: 240 },
    });
    await userEvent.pointer({
      target: handle,
      coords: { clientX: 284, clientY: 240 },
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: handle,
      coords: { clientX: 284, clientY: 240 },
    });
    await waitFor(async () => {
      await expect(actionLog(canvasElement).textContent).toContain(
        "set-file-explorer-sidebar-width",
      );
      await expect(actionLog(canvasElement).textContent).toContain('"sidebarWidth":284');
    });
  },
};

export const DetailsViewTest: Story = {
  ...DetailsView,
  name: "view state 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "자세히" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "보통 아이콘" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  },
};
