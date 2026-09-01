import { createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { WindowControlsUI } from "../window";
import { FolderFrameUI, FolderViewerUI } from "./index";

afterEach(() => {
  cleanupUITest();
});

describe("FolderViewerUI", () => {
  it("sidebar/content slots, ref와 native section props를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <FolderViewerUI
        aria-label="프로젝트 폴더"
        className="project-folder"
        contentSlot={<article>프로젝트 카드</article>}
        data-layout="folder"
        ref={ref}
        sidebar={<nav>폴더 탐색</nav>}
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
    expect(sidebar.textContent).toBe("폴더 탐색");
    expect(view.getByText("프로젝트 카드")).toBeTruthy();
  });

  it("contentSlot이 없으면 children을 content grid slot으로 사용한다", () => {
    const view = renderUITest(
      <FolderViewerUI aria-label="문서 폴더">
        <article>문서 카드</article>
      </FolderViewerUI>,
    );
    const card = view.getByText("문서 카드");

    expect(card.parentElement?.className).toBe("wd-folder-viewer-ui__content");
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

    view.getByRole("button", { name: "닫기" }).click();
    expect(onControl).toHaveBeenCalledWith({ control: "close" });
  });
});
