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
