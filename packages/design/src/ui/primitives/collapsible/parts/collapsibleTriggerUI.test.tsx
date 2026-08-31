import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { CollapsibleRootUI } from "./collapsibleRootUI";
import { CollapsibleTriggerUI } from "./collapsibleTriggerUI";

afterEach(cleanupUITest);

describe("CollapsibleTriggerUI", () => {
  it("기본 type과 닫힌 상태를 button에 반영한다", () => {
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI>문서</CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "문서" });

    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.classList.contains("wd-collapsible-ui__trigger")).toBe(true);
  });

  it("label 앞에 접근성 이름에서 숨긴 상태 chevron 하나를 렌더링한다", () => {
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI>문서</CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "문서" });
    const icons = trigger.querySelectorAll(".wd-collapsible-ui__trigger-icon");

    expect(icons).toHaveLength(1);
    expect(icons[0]?.tagName.toLowerCase()).toBe("svg");
    expect(icons[0]?.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.firstElementChild).toBe(icons[0]);
  });

  it("동일한 chevron을 유지하며 trigger의 open 상태 신호를 갱신한다", () => {
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI>문서</CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "문서" });
    const icon = trigger.querySelector(".wd-collapsible-ui__trigger-icon");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.querySelector(".wd-collapsible-ui__trigger-icon")).toBe(icon);
  });

  it("native prop과 명시한 type을 전달한다", () => {
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI className="folder-trigger" data-folder="documents" type="submit">
          문서
        </CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "문서" });

    expect(trigger.classList.contains("folder-trigger")).toBe(true);
    expect(trigger.getAttribute("data-folder")).toBe("documents");
    expect(trigger.getAttribute("type")).toBe("submit");
  });

  it("전달한 ref를 button에 연결한다", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI ref={ref}>문서</CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );

    expect(ref.current).toBe(screen.getByRole("button", { name: "문서" }));
  });

  it("click callback을 실행한다", () => {
    const onClick = vi.fn();
    renderUITest(
      <CollapsibleRootUI>
        <CollapsibleTriggerUI onClick={onClick}>문서</CollapsibleTriggerUI>
      </CollapsibleRootUI>,
    );

    fireEvent.click(screen.getByRole("button", { name: "문서" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
