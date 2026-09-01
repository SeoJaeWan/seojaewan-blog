import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverCloseUI } from "./popoverCloseUI";
import { PopoverContentUI } from "./popoverContentUI";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTitleUI } from "./popoverTitleUI";

afterEach(cleanupUITest);

const CloseExample = ({
  onOpenChange,
}: {
  onOpenChange?: Parameters<typeof PopoverRootUI>[0]["onOpenChange"];
}) => (
  <PopoverRootUI defaultOpen onOpenChange={onOpenChange}>
    <PopoverContentUI>
      <PopoverTitleUI>계정 정보</PopoverTitleUI>
      <PopoverCloseUI>닫기</PopoverCloseUI>
    </PopoverContentUI>
  </PopoverRootUI>
);

describe("PopoverCloseUI", () => {
  it("기본 type과 className을 button에 반영한다", async () => {
    renderUITest(<CloseExample />);
    const close = await screen.findByRole("button", { name: "닫기" });

    expect(close.getAttribute("type")).toBe("button");
    expect(close.classList.contains("wd-popover-ui__close")).toBe(true);
  });

  it("native prop, 명시한 type과 ref를 button에 전달한다", async () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <PopoverRootUI defaultOpen>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
          <PopoverCloseUI className="account-close" data-action="close" ref={ref} type="submit">
            닫기
          </PopoverCloseUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );
    const close = await screen.findByRole("button", { name: "닫기" });

    expect(close.classList.contains("account-close")).toBe(true);
    expect(close.getAttribute("data-action")).toBe("close");
    expect(close.getAttribute("type")).toBe("submit");
    expect(ref.current).toBe(close);
  });

  it("click callback과 close reason을 보고한다", async () => {
    const onClick = vi.fn();
    const onOpenChange = vi.fn();
    renderUITest(
      <PopoverRootUI defaultOpen onOpenChange={onOpenChange}>
        <PopoverContentUI>
          <PopoverTitleUI>계정 정보</PopoverTitleUI>
          <PopoverCloseUI onClick={onClick}>닫기</PopoverCloseUI>
        </PopoverContentUI>
      </PopoverRootUI>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "닫기" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
  });
});
