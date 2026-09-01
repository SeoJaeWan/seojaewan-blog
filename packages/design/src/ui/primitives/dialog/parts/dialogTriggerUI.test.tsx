import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTriggerUI } from "./dialogTriggerUI";

afterEach(cleanupUITest);

describe("DialogTriggerUI", () => {
  it("기본 type과 dialog 관계를 button에 반영한다", () => {
    renderUITest(
      <DialogRootUI>
        <DialogTriggerUI>설정 열기</DialogTriggerUI>
      </DialogRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "설정 열기" });

    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.classList.contains("wd-dialog-ui__trigger")).toBe(true);
  });

  it("native prop, 명시한 type과 ref를 button에 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <DialogRootUI>
        <DialogTriggerUI className="settings-trigger" data-action="open" ref={ref} type="submit">
          설정 열기
        </DialogTriggerUI>
      </DialogRootUI>,
    );
    const trigger = screen.getByRole("button", { name: "설정 열기" });

    expect(trigger.classList.contains("settings-trigger")).toBe(true);
    expect(trigger.getAttribute("data-action")).toBe("open");
    expect(trigger.getAttribute("type")).toBe("submit");
    expect(ref.current).toBe(trigger);
  });

  it("click callback을 실행한다", () => {
    const onClick = vi.fn();
    renderUITest(
      <DialogRootUI>
        <DialogTriggerUI onClick={onClick}>설정 열기</DialogTriggerUI>
      </DialogRootUI>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
