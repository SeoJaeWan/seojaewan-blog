import { type ReactNode, useState } from "react";

import {
  Code20Regular,
  Document20Regular,
  Folder20Regular,
  Notebook20Regular,
} from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  RouteInputUI,
  TagInputUI,
  WindowControlsUI,
  WindowRouteBarUI,
  WindowTabUI,
} from "../window";
import {
  FolderCategoryItemUI,
  FolderFileCardUI,
  type FolderFileCardUISize,
  FolderFileGridUI,
  FolderFrameUI,
  FolderSidebarUI,
  FolderViewerUI,
} from "./index";

const routeOptions = [
  { label: "블로그", value: "blog" },
  { label: "프로젝트", value: "projects" },
  { label: "소개", value: "about" },
] as const;

const tagOptions = [
  { label: "Frontend", value: "frontend" },
  { label: "Design system", value: "design-system" },
  { label: "Performance", value: "performance" },
] as const;

const cards = [
  { icon: <Code20Regular />, title: "React Server Components 정리", tone: "blue" },
  { icon: <Folder20Regular />, title: "모노레포 디자인 시스템 구축", tone: "violet" },
  { icon: <Notebook20Regular />, title: "Web Vitals 개선 기록", tone: "green" },
  { icon: <Document20Regular />, title: "SSR에서 CSR로 바꾼 이유", tone: "amber" },
] as const;

const Cover = ({ children, tone }: { children: ReactNode; tone: string }) => (
  <span className="wd-folder-story-cover" data-tone={tone}>
    {children}
  </span>
);

const Sidebar = () => (
  <FolderSidebarUI aria-label="카테고리">
    <FolderCategoryItemUI defaultOpen icon={<Folder20Regular />} label="블로그" selected>
      <FolderCategoryItemUI icon={<Document20Regular />} label="React" />
      <FolderCategoryItemUI icon={<Document20Regular />} label="성능" />
    </FolderCategoryItemUI>
    <FolderCategoryItemUI icon={<Folder20Regular />} label="프로젝트" />
    <FolderCategoryItemUI icon={<Folder20Regular />} label="코딩 테스트" />
    <FolderCategoryItemUI icon={<Folder20Regular />} label="소개" />
  </FolderSidebarUI>
);

const FileGrid = ({
  cardSize = "medium",
  longTitle = false,
  onCardAction,
}: {
  cardSize?: FolderFileCardUISize;
  longTitle?: boolean;
  onCardAction?: (title: string) => void;
}) => (
  <FolderFileGridUI aria-label="블로그 파일" cardSize={cardSize}>
    {cards.map((card, index) => {
      const title =
        longTitle && index === 0
          ? `${card.title} — local-container-query-keeps-this-long-title-contained`
          : card.title;

      return (
        <FolderFileCardUI
          cover={<Cover tone={card.tone}>{card.icon}</Cover>}
          key={card.title}
          onClick={() => onCardAction?.(card.title)}
          selected={index === 0}
          title={title}
        />
      );
    })}
  </FolderFileGridUI>
);

const Viewer = ({
  cardSize,
  longTitle = false,
  onCardAction,
}: {
  cardSize?: FolderFileCardUISize;
  longTitle?: boolean;
  onCardAction?: (title: string) => void;
}) => (
  <FolderViewerUI aria-label="폴더 보기" sidebar={<Sidebar />} sidebarLabel="폴더 사이드바">
    <FileGrid cardSize={cardSize} longTitle={longTitle} onCardAction={onCardAction} />
  </FolderViewerUI>
);

const Container = ({ children, width }: { children: ReactNode; width: number }) => (
  <div className="wd-folder-story-container" data-testid="folder-container" style={{ width }}>
    {children}
  </div>
);

const FolderWindowProductFixture = () => {
  const [lastAction, setLastAction] = useState("none");

  return (
    <div className="wd-folder-story-window-stage">
      <FolderFrameUI
        aria-label="블로그 폴더 창"
        bounds={{ blockSize: 500, inlineSize: 840, insetBlockStart: 16, insetInlineStart: 16 }}
        controls={<WindowControlsUI />}
        resizable
        routeBar={
          <WindowRouteBarUI
            aria-label="블로그 경로"
            forwardDisabled
            tagInput={
              <TagInputUI defaultValue="design-system" label="태그 필터" options={tagOptions} />
            }
          >
            <RouteInputUI
              defaultInputValue="블로그"
              defaultValue="blog"
              label="현재 경로"
              options={routeOptions}
            />
          </WindowRouteBarUI>
        }
        titleContent={
          <WindowTabUI icon={<Folder20Regular aria-hidden="true" />} titleContent="블로그" />
        }
      >
        <Viewer onCardAction={setLastAction} />
        <output aria-label="마지막 파일 동작" className="wd-folder-story-probe">
          {lastAction}
        </output>
      </FolderFrameUI>
    </div>
  );
};

const meta = {
  title: "UI/Components/Folder",
  component: FolderViewerUI,
  subcomponents: {
    CategoryItem: FolderCategoryItemUI,
    FileCard: FolderFileCardUI,
    FileGrid: FolderFileGridUI,
    Frame: FolderFrameUI,
    Sidebar: FolderSidebarUI,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "### 무엇을 제공하나요?\nFolder family는 Window 위에 Sidebar, Category disclosure, FileGrid와 FileCard를 조합하는 여섯 개 실제 Component를 제공합니다.\n\n### 제품에서는 어디에 쓰나요?\n`Product Reference — complete Folder Window`는 Window Tab·Controls·RouteBar·RouteInput·TagInput과 Folder 역할을 함께 사용해 Windows 탐색기형 블로그 창을 재현합니다. Category는 CollapsibleUI, FileCard는 ButtonUI를 사용합니다.\n\n### 책임 범위\n이 family는 container 기반 layout, disclosure/card 표현과 native UI event만 소유합니다. category/file data, route 실행, selection persistence와 content identity는 상위 계층이 소유합니다.",
      },
    },
    layout: "centered",
  },
} satisfies Meta<typeof FolderViewerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Narrow420: Story = {
  name: "Contract — 420px container",
  render: () => (
    <Container width={420}>
      <Viewer longTitle />
    </Container>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId("folder-container");
    const viewer = canvas.getByRole("region", { name: "폴더 보기" });
    const sidebar = viewer.querySelector(".wd-folder-viewer-ui__sidebar") as HTMLElement;
    const grid = canvas.getByRole("group", { name: "블로그 파일" });
    const fileCards = canvas.getAllByRole("button", { name: /정리|구축|기록|이유/ });
    const card = fileCards[0];
    const gridStyle = getComputedStyle(grid);
    const gridContentWidth =
      grid.clientWidth - parseFloat(gridStyle.paddingLeft) - parseFloat(gridStyle.paddingRight);

    await expect(getComputedStyle(container).width).toBe("420px");
    await expect(getComputedStyle(viewer).containerType).toBe("inline-size");
    await expect(getComputedStyle(viewer).containerName).toBe("wd-folder-viewer");
    await expect(getComputedStyle(sidebar).display).toBe("none");
    await expect(getComputedStyle(grid).columnGap).toBe("0px");
    await expect(card.getBoundingClientRect().width).toBeCloseTo(gridContentWidth / 2, 0);
    await expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth);
    await expect(card.querySelector(".wd-folder-file-card-ui__title")?.scrollWidth).toBeGreaterThan(
      card.querySelector(".wd-folder-file-card-ui__title")?.clientWidth ?? 0,
    );
  },
};

export const WideSizes: Story = {
  name: "Contract — card sizes and sidebar",
  render: () => (
    <Container width={1024}>
      <Viewer cardSize="large" />
    </Container>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sidebar = canvas.getByRole("complementary", { name: "폴더 사이드바" });
    const grid = canvas.getByRole("group", { name: "블로그 파일" });
    const card = canvas.getByRole("button", { name: "React Server Components 정리" });
    const cover = card.querySelector(".wd-folder-file-card-ui__cover") as HTMLElement;
    const category = canvas.getByRole("button", { name: "블로그" });
    const categoryIcon = category.querySelector(".wd-folder-category-item-ui__icon") as HTMLElement;

    await expect(getComputedStyle(sidebar).display).toBe("block");
    await expect(sidebar.getBoundingClientRect().width).toBeCloseTo(1024 / 6, 0);
    await expect(getComputedStyle(grid).columnGap).toBe("16px");
    await expect(getComputedStyle(grid).rowGap).toBe("8px");
    await expect(getComputedStyle(card).width).toBe("320px");
    await expect(getComputedStyle(cover).aspectRatio).toBe("3 / 2");
    await expect(getComputedStyle(category).fontSize).toBe("12px");
    await expect(getComputedStyle(categoryIcon).width).toBe("15px");
  },
};

export const ProductReference: Story = {
  name: "Product Reference — complete Folder Window",
  parameters: {
    docs: {
      description: {
        story:
          "Window chrome, route/tag row, hierarchical FolderSidebar와 3:2 cover card grid가 하나의 완성된 제품 reference로 보입니다. 모든 data는 Story에만 있는 결정적 fixture입니다.",
      },
    },
  },
  render: () => <FolderWindowProductFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByRole("region", { name: "블로그 폴더 창" });
    const frameScope = within(frame);
    const sidebar = frameScope.getByRole("navigation", { name: "카테고리" });
    const category = frameScope.getByRole("button", { name: "블로그" });
    const card = frameScope.getByRole("button", { name: "모노레포 디자인 시스템 구축" });

    await expect(frame.querySelector(".wd-window-tab-ui")).toBeVisible();
    await expect(frameScope.getByRole("navigation", { name: "블로그 경로" })).toBeVisible();
    await expect(frameScope.getByRole("combobox", { name: "현재 경로" })).toBeVisible();
    await expect(frameScope.getByRole("combobox", { name: "태그 필터" })).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(category).toHaveAttribute("aria-expanded", "true");
    await expect(frameScope.getByRole("group", { name: "블로그 파일" })).toBeVisible();
    await expect(frameScope.getAllByRole("button", { name: /정리|구축|기록|이유/ })).toHaveLength(
      4,
    );

    await userEvent.click(category);
    await expect(category).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(card);
    await expect(frameScope.getByRole("status", { name: "마지막 파일 동작" })).toHaveTextContent(
      "모노레포 디자인 시스템 구축",
    );
  },
};
