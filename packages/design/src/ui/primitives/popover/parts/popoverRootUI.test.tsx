import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { PopoverContentUI } from "./popoverContentUI";
import { PopoverRootUI } from "./popoverRootUI";
import { PopoverTitleUI } from "./popoverTitleUI";
import { PopoverTriggerUI } from "./popoverTriggerUI";

afterEach(cleanupUITest);

const RootExample = (props: Parameters<typeof PopoverRootUI>[0]) => (
  <PopoverRootUI {...props}>
    <PopoverTriggerUI>계정</PopoverTriggerUI>
    <PopoverContentUI>
      <PopoverTitleUI>계정 정보</PopoverTitleUI>
    </PopoverContentUI>
  </PopoverRootUI>
);

describe("PopoverRootUI", () => {
  it("기본적으로 non-modal content를 닫아 둔다", () => {
    renderUITest(<RootExample />);

    expect(screen.getByRole("button", { name: "계정" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("defaultOpen으로 uncontrolled content를 연다", async () => {
    renderUITest(<RootExample defaultOpen />);

    expect(await screen.findByRole("dialog", { name: "계정 정보" })).not.toBeNull();
  });

  it("trigger 동작의 프로젝트 소유 reason을 보고한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootExample onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "계정" }));

    expect(await screen.findByRole("dialog", { name: "계정 정보" })).not.toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: "trigger-press" });
  });

  it("open이 controlled이면 callback 뒤에도 현재 상태를 유지한다", async () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(<RootExample onOpenChange={onOpenChange} open />);
    expect(await screen.findByRole("dialog", { name: "계정 정보" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "계정" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "trigger-press" });
    expect(screen.getByRole("dialog", { name: "계정 정보" })).not.toBeNull();

    view.rerender(<RootExample onOpenChange={onOpenChange} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
