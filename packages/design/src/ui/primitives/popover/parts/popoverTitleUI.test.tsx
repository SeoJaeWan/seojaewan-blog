import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverContentUI } from "./popoverContentUI";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTitleUI } from "./popoverTitleUI";

afterEach(cleanupUITest);

describe("PopoverTitleUI", () => {
  it("content의 접근 가능한 이름이 되는 heading을 렌더링한다", async () => {
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "계정 정보" });
    const title = screen.getByText("계정 정보");

    expect(title.tagName).toBe("H2");
    expect(title.classList.contains("wd-popover-ui__title")).toBe(true);
    expect(content.getAttribute("aria-labelledby")).toContain(title.id);
  });

  it("native prop, className과 ref를 heading에 전달한다", async () => {
    const ref = createRef<HTMLHeadingElement>();
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI className="account-title" data-title="account" ref={ref}>
            계정 정보
          </PopoverTitleUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    await screen.findByRole("dialog", { name: "계정 정보" });
    const title = screen.getByText("계정 정보");

    expect(title.classList.contains("account-title")).toBe(true);
    expect(title.getAttribute("data-title")).toBe("account");
    expect(ref.current).toBe(title);
  });
});
