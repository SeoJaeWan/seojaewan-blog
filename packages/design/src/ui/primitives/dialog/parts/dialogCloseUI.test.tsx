import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogCloseUI } from "./dialogCloseUI";
import { DialogContentUI } from "./dialogContentUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTitleUI } from "./dialogTitleUI";

afterEach(cleanupUITest);

describe("DialogCloseUI", () => {
  it("기본 type과 className을 button에 반영한다", async () => {
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
            <DialogCloseUI>닫기</DialogCloseUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const close = await screen.findByRole("button", { name: "닫기" });

    expect(close.getAttribute("type")).toBe("button");
    expect(close.classList.contains("wd-dialog-ui__close")).toBe(true);
  });

  it("native prop, 명시한 type과 ref를 button에 전달한다", async () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
            <DialogCloseUI className="settings-close" data-action="close" ref={ref} type="submit">
              닫기
            </DialogCloseUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const close = await screen.findByRole("button", { name: "닫기" });

    expect(close.classList.contains("settings-close")).toBe(true);
    expect(close.getAttribute("data-action")).toBe("close");
    expect(close.getAttribute("type")).toBe("submit");
    expect(ref.current).toBe(close);
  });

  it("click callback과 close reason을 보고한다", async () => {
    const onClick = vi.fn();
    const onOpenChange = vi.fn();
    renderUITest(
      <DialogRootUI defaultOpen onOpenChange={onOpenChange}>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
            <DialogCloseUI onClick={onClick}>닫기</DialogCloseUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "닫기" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
  });
});
