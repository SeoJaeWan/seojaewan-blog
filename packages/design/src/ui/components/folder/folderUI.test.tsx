import { createRef } from "react";

import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { WindowControlsUI } from "../window";
import {
  FolderCategoryItemUI,
  FolderFileCardUI,
  FolderFileGridUI,
  FolderFrameUI,
  FolderSidebarFileItemUI,
  FolderSidebarUI,
  FolderViewerUI,
  FolderWindowUI,
} from "./index";

afterEach(() => {
  cleanupUITest();
});

describe("FolderSidebarUI", () => {
  it("접근 가능한 navigation과 category list에 native props와 ref를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <FolderSidebarUI aria-label="폴더 목록" data-layout="tree" ref={ref}>
        <li>블로그</li>
      </FolderSidebarUI>,
    );
    const sidebar = view.getByRole("navigation", { name: "폴더 목록" });

    expect(ref.current).toBe(sidebar);
    expect(sidebar.getAttribute("data-layout")).toBe("tree");
    expect(sidebar.querySelector("ul")?.textContent).toBe("블로그");
  });
});

describe("FolderCategoryItemUI", () => {
  it("CollapsibleUI chevron disclosure와 ButtonUI label 선택을 독립 action으로 조합한다", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    const ref = createRef<HTMLLIElement>();
    const view = renderUITest(
      <FolderSidebarUI aria-label="카테고리">
        <FolderCategoryItemUI
          defaultOpen
          icon={<span>F</span>}
          label="블로그"
          onOpenChange={onOpenChange}
          onSelect={onSelect}
          ref={ref}
          selected
        >
          <FolderSidebarFileItemUI title="React" />
        </FolderCategoryItemUI>
      </FolderSidebarUI>,
    );
    const disclosure = view.getByRole("button", { name: "블로그 하위 항목 표시 전환" });
    const selection = view.getByRole("button", { name: "블로그" });

    expect(ref.current?.tagName).toBe("LI");
    expect(disclosure.className).toContain("wd-collapsible-ui__trigger");
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(selection.className).toContain("wd-button-ui");
    expect(selection.getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("button", { name: "React" })).toBeTruthy();
    expect(view.getByText("F").parentElement?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(selection);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(disclosure);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
  });

  it("controlled disclosure와 native trigger props를 그대로 전달한다", () => {
    const onContextMenu = vi.fn();
    const view = renderUITest(
      <FolderCategoryItemUI
        label="프로젝트"
        open={false}
        triggerProps={{ "aria-label": "프로젝트 폴더 열기", onContextMenu }}
      >
        <FolderSidebarFileItemUI title="문서" />
      </FolderCategoryItemUI>,
    );
    const trigger = view.getByRole("button", { name: "프로젝트 폴더 열기" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    expect(onContextMenu).toHaveBeenCalledOnce();
  });
});

describe("FolderSidebarFileItemUI", () => {
  it("child file row의 selected 표현, native props와 activation을 전달한다", () => {
    const onSelect = vi.fn();
    const ref = createRef<HTMLLIElement>();
    const view = renderUITest(
      <FolderSidebarFileItemUI
        buttonProps={{ id: "article-action" }}
        icon={<span>file</span>}
        onSelect={onSelect}
        ref={ref}
        selected
        title="React 정리"
      />,
    );
    const action = view.getByRole("button", { name: "React 정리" });

    expect(ref.current?.className).toContain("wd-folder-sidebar-file-item-ui");
    expect(action.className).toContain("wd-button-ui");
    expect(action.getAttribute("aria-current")).toBe("page");
    expect(action.id).toBe("article-action");
    expect(view.getByText("file").parentElement?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(action);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("FolderFileGridUI", () => {
  it("card size, group name, ref와 native props를 layout root에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    const view = renderUITest(
      <FolderFileGridUI aria-label="프로젝트 파일" cardSize="large" data-sort="recent" ref={ref}>
        <FolderFileCardUI title="디자인 시스템" />
      </FolderFileGridUI>,
    );
    const grid = view.getByRole("group", { name: "프로젝트 파일" });

    expect(ref.current).toBe(grid);
    expect(grid.getAttribute("data-card-size")).toBe("large");
    expect(grid.getAttribute("data-sort")).toBe("recent");
    expect(view.getByRole("button", { name: "디자인 시스템" })).toBeTruthy();
  });
});

describe("FolderFileCardUI", () => {
  it("ButtonUI action에 cover/title, 선택 표현과 native event를 조합한다", () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <FolderFileCardUI
        className="project-card"
        cover={<span>cover text</span>}
        data-kind="article"
        onClick={onClick}
        ref={ref}
        selected
        title="React Server Components 정리"
      />,
    );
    const card = view.getByRole("button", { name: "React Server Components 정리" });

    expect(ref.current).toBe(card);
    expect(card.className).toContain("wd-button-ui");
    expect(card.className).toContain("wd-folder-file-card-ui");
    expect(card.className).toContain("project-card");
    expect(card.getAttribute("data-selected")).toBe("true");
    expect(card.getAttribute("data-kind")).toBe("article");
    expect(view.getByText("cover text").parentElement?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("FolderViewerUI", () => {
  it("sidebar/content slots, ref와 native section props를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <FolderViewerUI
        aria-label="프로젝트 폴더"
        className="project-folder"
        contentSlot={
          <FolderFileGridUI aria-label="파일">
            <span>프로젝트 카드</span>
          </FolderFileGridUI>
        }
        data-layout="folder"
        ref={ref}
        sidebar={
          <FolderSidebarUI aria-label="폴더 탐색">
            <li>프로젝트</li>
          </FolderSidebarUI>
        }
        sidebarLabel="폴더 목록"
      />,
    );
    const viewer = view.getByRole("region", { name: "프로젝트 폴더" });
    const sidebar = view.getByRole("complementary", { name: "폴더 목록" });

    expect(viewer.tagName).toBe("SECTION");
    expect(ref.current).toBe(viewer);
    expect(viewer.className).toContain("wd-folder-viewer-ui");
    expect(viewer.className).toContain("project-folder");
    expect(viewer.getAttribute("data-layout")).toBe("folder");
    expect(sidebar.textContent).toBe("프로젝트");
    expect(view.getByText("프로젝트 카드")).toBeTruthy();
  });

  it("contentSlot이 없으면 children을 content slot으로 사용한다", () => {
    const view = renderUITest(
      <FolderViewerUI aria-label="문서 폴더">
        <FolderFileGridUI aria-label="문서 파일" />
      </FolderViewerUI>,
    );
    const grid = view.getByRole("group", { name: "문서 파일" });

    expect(grid.parentElement?.className).toBe("wd-folder-viewer-ui__content");
    expect(view.queryByRole("complementary")).toBeNull();
  });
});

describe("FolderFrameUI", () => {
  it("Window presentation contract에 title, control, body와 native props를 조합한다", () => {
    const onControl = vi.fn();
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <FolderFrameUI
        activity="background"
        aria-label="블로그 폴더 창"
        bounds={{ blockSize: 480, inlineSize: 840 }}
        className="blog-folder-frame"
        controls={<WindowControlsUI onControl={onControl} />}
        leading="폴더"
        ref={ref}
        titleBarProps={{ "aria-label": "폴더 창 제목 표시줄" }}
        titleContent="블로그"
      >
        <FolderViewerUI aria-label="블로그 폴더 본문">본문</FolderViewerUI>
      </FolderFrameUI>,
    );
    const frame = view.getByRole("region", { name: "블로그 폴더 창" });
    const titleBar = view.getByText("블로그").closest("header");

    expect(ref.current).toBe(frame);
    expect(frame.className).toContain("wd-window-frame-ui");
    expect(frame.className).toContain("wd-folder-frame-ui");
    expect(frame.className).toContain("blog-folder-frame");
    expect(frame.getAttribute("data-activity")).toBe("background");
    expect(titleBar?.getAttribute("aria-label")).toBe("폴더 창 제목 표시줄");
    expect(view.getByText("폴더").getAttribute("aria-hidden")).toBe("true");
    expect(view.getByRole("region", { name: "블로그 폴더 본문" })).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "닫기" }));
    expect(onControl).toHaveBeenCalledWith({ control: "close" });
  });
});

describe("FolderWindowUI", () => {
  it("Window API 위에 complete Folder roles와 presentation callbacks를 조합한다", () => {
    const onCategoryOpenChange = vi.fn();
    const onCategorySelect = vi.fn();
    const onFileOpen = vi.fn();
    const onFileSelect = vi.fn();
    const onSidebarFileSelect = vi.fn();
    const view = renderUITest(
      <FolderWindowUI
        aria-label="프로젝트 폴더 창"
        categories={[
          {
            defaultOpen: true,
            files: [{ title: "중첩 문서", value: "nested" }],
            label: "프로젝트",
            selected: true,
            value: "projects",
          },
        ]}
        files={[{ selected: true, title: "카드 문서", value: "card" }]}
        onCategoryOpenChange={onCategoryOpenChange}
        onCategorySelect={onCategorySelect}
        onFileOpen={onFileOpen}
        onFileSelect={onFileSelect}
        onSidebarFileSelect={onSidebarFileSelect}
        routeBarProps={{ "aria-label": "프로젝트 경로" }}
        routeInputProps={{
          defaultValue: "projects",
          label: "현재 경로",
          options: [{ label: "프로젝트", value: "projects" }],
        }}
        sidebarLabel="프로젝트 분류"
        tagInputProps={{
          label: "태그 필터",
          options: [{ label: "Design", value: "design" }],
        }}
        title="프로젝트"
        viewerLabel="프로젝트 보기"
      />,
    );
    const frame = view.getByRole("region", { name: "프로젝트 폴더 창" });
    const disclosure = view.getByRole("button", { name: "프로젝트 하위 항목 표시 전환" });
    const category = view.getByRole("button", { name: "프로젝트" });
    const card = view.getByRole("button", { name: "카드 문서" });

    expect(frame.getAttribute("data-variant")).toBe("folder");
    expect(view.getByRole("navigation", { name: "프로젝트 경로" })).toBeTruthy();
    expect(view.getByRole("navigation", { name: "프로젝트 분류" })).toBeTruthy();
    expect(view.getByRole("group", { name: "프로젝트 보기 파일" })).toBeTruthy();
    expect(view.getByRole("combobox", { name: "태그 필터" })).toBeTruthy();

    fireEvent.click(category);
    expect(onCategorySelect).toHaveBeenCalledWith({ value: "projects" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(disclosure);
    expect(onCategoryOpenChange).toHaveBeenCalledWith({ open: false, value: "projects" });
    expect(onCategorySelect).toHaveBeenCalledOnce();

    fireEvent.click(disclosure);
    fireEvent.click(view.getByRole("button", { name: "중첩 문서" }));
    expect(onSidebarFileSelect).toHaveBeenCalledWith({
      categoryValue: "projects",
      value: "nested",
    });

    fireEvent.click(card);
    fireEvent.doubleClick(card);
    expect(onFileSelect).toHaveBeenCalledWith({ value: "card" });
    expect(onFileOpen).toHaveBeenCalledWith({ value: "card" });
  });
});
