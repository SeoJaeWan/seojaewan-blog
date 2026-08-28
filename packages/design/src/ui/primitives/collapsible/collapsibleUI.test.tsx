import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { CollapsibleUI } from "./collapsibleUI";

afterEach(cleanupUITest);

describe("CollapsibleUI", () => {
  it("Trigger와 Panel을 펼침 상태와 ARIA 관계로 조합한다", () => {
    renderUITest(
      <CollapsibleUI.Root>
        <CollapsibleUI.Trigger>문서</CollapsibleUI.Trigger>
        <CollapsibleUI.Panel>프로젝트 파일</CollapsibleUI.Panel>
      </CollapsibleUI.Root>,
    );
    const trigger = screen.getByRole("button", { name: "문서" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("프로젝트 파일")).toBeNull();

    fireEvent.click(trigger);

    const panel = screen.getByText("프로젝트 파일");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  });
});
