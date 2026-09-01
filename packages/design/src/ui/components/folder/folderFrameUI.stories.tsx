import type { CSSProperties, ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { WindowControlsUI } from "../window";
import { FolderFrameUI, FolderViewerUI } from "./index";

const cards = [
  "React Server Components 정리",
  "모노레포 디자인 시스템 구축",
  "Web Vitals 개선 기록",
  "SSR에서 CSR로 바꾼 이유",
];

const cardStyle: CSSProperties = {
  background: "var(--wd-color-surface-muted)",
  border: "1px solid var(--wd-color-border-default)",
  borderRadius: "var(--wd-reference-radius-2)",
  boxSizing: "border-box",
  minHeight: "112px",
  padding: "12px",
};

const FolderSlots = ({ longContent = false }: { longContent?: boolean }) => (
  <>
    {cards.map((title, index) => (
      <article data-testid="folder-card" key={title} style={cardStyle}>
        <strong>{title}</strong>
        {longContent && index === 0 ? (
          <p data-testid="long-content">
            local-container-query-keeps-this-intentionally-long-content-contained-within-the-grid
          </p>
        ) : null}
      </article>
    ))}
  </>
);

const Sidebar = () => (
  <nav aria-label="카테고리">
    <strong>폴더</strong>
    <div>블로그</div>
    <div>프로젝트</div>
    <div>소개</div>
  </nav>
);

const Container = ({ children, width }: { children: ReactNode; width: number }) => (
  <div
    data-testid="folder-container"
    style={{ border: "1px solid var(--wd-color-border-default)", height: 420, width }}
  >
    {children}
  </div>
);

const Viewer = ({ longContent = false }: { longContent?: boolean }) => (
  <FolderViewerUI aria-label="폴더 보기" sidebar={<Sidebar />} sidebarLabel="폴더 사이드바">
    <FolderSlots longContent={longContent} />
  </FolderViewerUI>
);

const meta = {
  title: "UI/Components/Folder",
  component: FolderViewerUI,
  subcomponents: {
    Frame: FolderFrameUI,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "FolderViewerUI는 이미 render 가능한 sidebar/content slots만 배치하며 자신의 inline-size를 기준으로 반응합니다. FolderFrameUI는 검증된 Window chrome을 조합하고 content data, selection, routing과 control action은 소유하지 않습니다.",
      },
    },
    layout: "centered",
  },
} satisfies Meta<typeof FolderViewerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const getGridColumnCount = (element: HTMLElement) =>
  getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length;

export const Narrow420: Story = {
  name: "container — 420px narrow",
  render: () => (
    <Container width={420}>
      <Viewer longContent />
    </Container>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId("folder-container");
    const viewer = canvas.getByRole("region", { name: "폴더 보기" });
    const sidebar = viewer.querySelector(".wd-folder-viewer-ui__sidebar") as HTMLElement;
    const content = canvas.getAllByTestId("folder-card")[0]?.parentElement as HTMLElement;

    await expect(window.innerWidth).toBeGreaterThan(768);
    await expect(getComputedStyle(container).width).toBe("420px");
    await expect(getComputedStyle(viewer).containerType).toBe("inline-size");
    await expect(getComputedStyle(viewer).containerName).toBe("wd-folder-viewer");
    await expect(getComputedStyle(sidebar).display).toBe("none");
    await expect(getGridColumnCount(content)).toBe(1);
    await expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
  },
};

export const Wide48Rem: Story = {
  name: "container — 48rem and wider",
  render: () => (
    <Container width={768}>
      <Viewer />
    </Container>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId("folder-container");
    const sidebar = canvas.getByRole("complementary", { name: "폴더 사이드바" });
    const content = canvas.getAllByTestId("folder-card")[0]?.parentElement as HTMLElement;

    await expect(parseFloat(getComputedStyle(container).width)).toBeGreaterThanOrEqual(768);
    await expect(getComputedStyle(sidebar).display).toBe("block");
    await expect(sidebar.clientWidth).toBeGreaterThan(0);
    await expect(getGridColumnCount(content)).toBeGreaterThanOrEqual(2);
  },
};

export const WindowComposition: Story = {
  name: "composition — Window presentation",
  render: () => (
    <div style={{ height: 520, position: "relative", width: 900 }}>
      <FolderFrameUI
        aria-label="프로젝트 폴더 창"
        bounds={{ blockSize: 460, inlineSize: 840, insetBlockStart: 24, insetInlineStart: 24 }}
        controls={<WindowControlsUI />}
        leading="▣"
        titleContent="프로젝트"
      >
        <Viewer />
      </FolderFrameUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByRole("region", { name: "프로젝트 폴더 창" });
    const title = frame.querySelector(".wd-window-title-bar-ui__title") as HTMLElement;

    await expect(frame).toHaveClass("wd-folder-frame-ui");
    await expect(title).toHaveTextContent("프로젝트");
    await expect(canvas.getByRole("button", { name: "최소화" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "최대화" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "닫기" })).toBeVisible();
    await expect(
      getComputedStyle(canvas.getByRole("complementary", { name: "폴더 사이드바" })).display,
    ).toBe("block");
  },
};
