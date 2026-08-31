import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogContentUI } from "./dialogContentUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTitleUI } from "./dialogTitleUI";
import { DialogTriggerUI } from "./dialogTriggerUI";

afterEach(cleanupUITest);

const RootExample = (props: Parameters<typeof DialogRootUI>[0]) => (
  <DialogRootUI {...props}>
    <DialogTriggerUI>설정 열기</DialogTriggerUI>
    <DialogPortalUI>
      <DialogContentUI>
        <DialogTitleUI>설정</DialogTitleUI>
      </DialogContentUI>
    </DialogPortalUI>
  </DialogRootUI>
);

describe("DialogRootUI", () => {
  it("기본적으로 modal content를 닫아 둔다", () => {
    renderUITest(<RootExample />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "설정 열기" }).getAttribute("aria-haspopup")).toBe(
      "dialog",
    );
  });

  it("defaultOpen으로 uncontrolled modal content를 연다", async () => {
    renderUITest(<RootExample defaultOpen />);

    expect(await screen.findByRole("dialog", { name: "설정" })).not.toBeNull();
  });

  it("trigger 동작의 프로젝트 소유 reason을 보고한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootExample onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("설정 열기"));

    expect(await screen.findByRole("dialog", { name: "설정" })).not.toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: "trigger-press" });
  });

  it("open이 controlled이면 callback 뒤에도 현재 상태를 유지한다", async () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(<RootExample onOpenChange={onOpenChange} open />);
    expect(await screen.findByRole("dialog", { name: "설정" })).not.toBeNull();

    fireEvent.click(screen.getByText("설정 열기"));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "trigger-press" });
    expect(screen.getByRole("dialog", { name: "설정" })).not.toBeNull();

    view.rerender(<RootExample onOpenChange={onOpenChange} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
