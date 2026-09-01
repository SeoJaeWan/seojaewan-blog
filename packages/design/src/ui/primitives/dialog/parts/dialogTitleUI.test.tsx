import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogContentUI } from "./dialogContentUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTitleUI } from "./dialogTitleUI";

afterEach(cleanupUITest);

describe("DialogTitleUI", () => {
  it("content의 접근 가능한 이름이 되는 heading을 렌더링한다", async () => {
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI>설정</DialogTitleUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "설정" });
    const title = screen.getByText("설정");

    expect(title.tagName).toBe("H2");
    expect(title.classList.contains("wd-dialog-ui__title")).toBe(true);
    expect(content.getAttribute("aria-labelledby")).toContain(title.id);
  });

  it("native prop, className과 ref를 heading에 전달한다", async () => {
    const ref = createRef<HTMLHeadingElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI>
            <DialogTitleUI className="settings-title" data-title="settings" ref={ref}>
              설정
            </DialogTitleUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    await screen.findByRole("dialog", { name: "설정" });
    const title = screen.getByText("설정");

    expect(title.classList.contains("settings-title")).toBe(true);
    expect(title.getAttribute("data-title")).toBe("settings");
    expect(ref.current).toBe(title);
  });
});
