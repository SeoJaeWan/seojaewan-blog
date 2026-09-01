import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { CollapsiblePanelUI } from "./collapsiblePanelUI";
import { CollapsibleRootUI } from "./collapsibleRootUI";

afterEach(cleanupUITest);

describe("CollapsiblePanelUI", () => {
  it("열린 Root에서 content와 기본 className을 렌더링한다", () => {
    renderUITest(
      <CollapsibleRootUI defaultOpen>
        <CollapsiblePanelUI>프로젝트 파일</CollapsiblePanelUI>
      </CollapsibleRootUI>,
    );
    const panel = screen.getByText("프로젝트 파일");

    expect(panel.tagName).toBe("DIV");
    expect(panel.classList.contains("wd-collapsible-ui__panel")).toBe(true);
  });

  it("native prop과 className을 전달한다", () => {
    renderUITest(
      <CollapsibleRootUI defaultOpen>
        <CollapsiblePanelUI className="folder-panel" data-folder="documents">
          프로젝트 파일
        </CollapsiblePanelUI>
      </CollapsibleRootUI>,
    );
    const panel = screen.getByText("프로젝트 파일");

    expect(panel.classList.contains("folder-panel")).toBe(true);
    expect(panel.getAttribute("data-folder")).toBe("documents");
  });

  it("전달한 ref를 panel div에 연결한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <CollapsibleRootUI defaultOpen>
        <CollapsiblePanelUI ref={ref}>프로젝트 파일</CollapsiblePanelUI>
      </CollapsibleRootUI>,
    );

    expect(ref.current).toBe(screen.getByText("프로젝트 파일"));
  });
});
