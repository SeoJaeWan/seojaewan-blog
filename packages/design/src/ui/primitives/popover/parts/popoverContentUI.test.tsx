import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverContentUI } from "./popoverContentUI";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTitleUI } from "./popoverTitleUI";

afterEach(cleanupUITest);

describe("PopoverContentUI", () => {
  it("기본 role과 className으로 content를 렌더링한다", async () => {
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "계정 정보" });

    expect(content.classList.contains("wd-popover-ui__content")).toBe(true);
    expect(content.closest(".wd-popover-ui__positioner")).not.toBeNull();
  });

  it("native prop과 className을 content에 전달한다", async () => {
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI className="account-content" data-account="current">
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "계정 정보" });

    expect(content.classList.contains("account-content")).toBe(true);
    expect(content.getAttribute("data-account")).toBe("current");
  });

  it("전달한 ref를 content div에 연결한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI ref={ref}>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );

    expect(ref.current).toBe(await screen.findByRole("dialog", { name: "계정 정보" }));
  });
});
