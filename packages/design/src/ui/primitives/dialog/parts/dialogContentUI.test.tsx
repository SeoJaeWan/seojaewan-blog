import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogContentUI } from "./dialogContentUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";
import { DialogTitleUI } from "./dialogTitleUI";

afterEach(cleanupUITest);

describe("DialogContentUI", () => {
  it("modal role과 기본 className을 가진 content를 렌더링한다", async () => {
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

    expect(content.getAttribute("aria-modal")).toBe("true");
    expect(content.classList.contains("wd-dialog-ui__content")).toBe(true);
    expect(content.parentElement?.classList.contains("wd-dialog-ui__viewport")).toBe(true);
  });

  it("native prop, className과 ref를 content에 전달한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogContentUI className="settings-content" data-dialog="settings" ref={ref}>
            <DialogTitleUI>설정</DialogTitleUI>
          </DialogContentUI>
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const content = await screen.findByRole("dialog", { name: "설정" });

    expect(content.classList.contains("settings-content")).toBe(true);
    expect(content.getAttribute("data-dialog")).toBe("settings");
    expect(ref.current).toBe(content);
  });
});
