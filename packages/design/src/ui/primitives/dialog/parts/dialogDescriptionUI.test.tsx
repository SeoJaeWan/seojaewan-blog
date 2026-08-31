import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogContentUI } from "./dialogContentUI";
import { DialogDescriptionUI } from "./dialogDescriptionUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTitleUI } from "./dialogTitleUI";

afterEach(cleanupUITest);

describe("DialogDescriptionUI", () => {
  it("content의 접근 가능한 설명이 되는 paragraph를 렌더링한다", async () => {
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
            <DialogDescriptionUI>환경 설정을 변경합니다.</DialogDescriptionUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "설정" });
    const description = screen.getByText("환경 설정을 변경합니다.");

    expect(description.tagName).toBe("P");
    expect(description.classList.contains("wd-dialog-ui__description")).toBe(true);
    expect(content.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("native prop, className과 ref를 paragraph에 전달한다", async () => {
    const ref = createRef<HTMLParagraphElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
            <DialogDescriptionUI className="settings-description" data-help="settings" ref={ref}>
              환경 설정을 변경합니다.
            </DialogDescriptionUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    await screen.findByRole("dialog", { name: "설정" });
    const description = screen.getByText("환경 설정을 변경합니다.");

    expect(description.classList.contains("settings-description")).toBe(true);
    expect(description.getAttribute("data-help")).toBe("settings");
    expect(ref.current).toBe(description);
  });
});
