import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { CollapsiblePanelUI } from "./collapsiblePanelUI";
import { CollapsibleRootUI } from "./collapsibleRootUI";
import { CollapsibleTriggerUI } from "./collapsibleTriggerUI";

afterEach(cleanupUITest);

const RootExample = (props: Parameters<typeof CollapsibleRootUI>[0]) => (
  <CollapsibleRootUI {...props}>
    <CollapsibleTriggerUI>문서</CollapsibleTriggerUI>
    <CollapsiblePanelUI>프로젝트 파일</CollapsiblePanelUI>
  </CollapsibleRootUI>
);

describe("CollapsibleRootUI", () => {
  it("native div prop과 className을 전달한다", () => {
    renderUITest(<RootExample className="folder-group" data-folder="documents" />);
    const root = screen.getByText("문서").parentElement;

    expect(root?.tagName).toBe("DIV");
    expect(root?.classList.contains("wd-collapsible-ui")).toBe(true);
    expect(root?.classList.contains("folder-group")).toBe(true);
    expect(root?.getAttribute("data-folder")).toBe("documents");
  });

  it("전달한 ref를 root div에 연결한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(<RootExample ref={ref} />);

    expect(ref.current?.classList.contains("wd-collapsible-ui")).toBe(true);
  });

  it("defaultOpen으로 uncontrolled 상태를 연다", () => {
    renderUITest(<RootExample defaultOpen />);

    expect(screen.getByRole("button", { name: "문서" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("프로젝트 파일")).not.toBeNull();
  });

  it("open과 onOpenChange로 controlled 상태를 보고한다", () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(<RootExample onOpenChange={onOpenChange} open={false} />);
    const trigger = screen.getByRole("button", { name: "문서" });

    fireEvent.click(trigger);

    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    view.rerender(<RootExample onOpenChange={onOpenChange} open />);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("disabled 상태에서는 펼침 상태를 바꾸지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootExample disabled onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "문서" });

    fireEvent.click(trigger);

    expect(trigger.hasAttribute("data-disabled")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
