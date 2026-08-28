import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTriggerUI } from "./popoverTriggerUI";

afterEach(cleanupUITest);

describe("PopoverTriggerUI", () => {
  it("기본 type과 상태를 button에 반영한다", () => {
    renderUITest(
      <PopoverRootUI>
        <PopoverTriggerUI>계정</PopoverTriggerUI>
      </PopoverRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "계정" });

    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.classList.contains("wd-popover-ui__trigger")).toBe(true);
  });

  it("native prop과 명시한 type을 전달한다", () => {
    renderUITest(
      <PopoverRootUI>
        <PopoverTriggerUI className="account-trigger" data-account="current" type="submit">
          계정
        </PopoverTriggerUI>
      </PopoverRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "계정" });

    expect(trigger.classList.contains("account-trigger")).toBe(true);
    expect(trigger.getAttribute("data-account")).toBe("current");
    expect(trigger.getAttribute("type")).toBe("submit");
  });

  it("전달한 ref를 button에 연결한다", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <PopoverRootUI>
        <PopoverTriggerUI ref={ref}>계정</PopoverTriggerUI>
      </PopoverRootUI>,
    );

    expect(ref.current).toBe(screen.getByRole("button", { name: "계정" }));
  });

  it("click callback을 실행한다", () => {
    const onClick = vi.fn();
    renderUITest(
      <PopoverRootUI>
        <PopoverTriggerUI onClick={onClick}>계정</PopoverTriggerUI>
      </PopoverRootUI>,
    );

    fireEvent.click(screen.getByRole("button", { name: "계정" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
