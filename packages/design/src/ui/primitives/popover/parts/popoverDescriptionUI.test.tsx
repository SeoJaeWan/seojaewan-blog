import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverContentUI } from "./popoverContentUI";
import { PopoverDescriptionUI } from "./popoverDescriptionUI";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTitleUI } from "./popoverTitleUI";

afterEach(cleanupUITest);

describe("PopoverDescriptionUI", () => {
  it("content의 접근 가능한 설명이 되는 paragraph를 렌더링한다", async () => {
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
          <PopoverDescriptionUI>로그인한 계정을 관리합니다.</PopoverDescriptionUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "계정 정보" });
    const description = screen.getByText("로그인한 계정을 관리합니다.");

    expect(description.tagName).toBe("P");
    expect(description.classList.contains("wd-popover-ui__description")).toBe(true);
    expect(content.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("native prop, className과 ref를 paragraph에 전달한다", async () => {
    const ref = createRef<HTMLParagraphElement>();
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
          <PopoverDescriptionUI className="account-description" data-help="account" ref={ref}>
            로그인한 계정을 관리합니다.
          </PopoverDescriptionUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    await screen.findByRole("dialog", { name: "계정 정보" });
    const description = screen.getByText("로그인한 계정을 관리합니다.");

    expect(description.classList.contains("account-description")).toBe(true);
    expect(description.getAttribute("data-help")).toBe("account");
    expect(ref.current).toBe(description);
  });
});
