import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogBackdropUI } from "./dialogBackdropUI";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";

afterEach(cleanupUITest);

describe("DialogBackdropUI", () => {
  it("열린 Root에서 기본 className을 가진 visual layer를 렌더링한다", async () => {
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogBackdropUI data-testid="backdrop" />
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const backdrop = await screen.findByTestId("backdrop");

    expect(backdrop.tagName).toBe("DIV");
    expect(backdrop.classList.contains("wd-dialog-ui__backdrop")).toBe(true);
  });

  it("native prop, className과 ref를 visual layer에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI>
          <DialogBackdropUI className="settings-backdrop" data-layer="backdrop" ref={ref} />
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const backdrop = ref.current;

    expect(backdrop?.classList.contains("settings-backdrop")).toBe(true);
    expect(backdrop?.getAttribute("data-layer")).toBe("backdrop");
    expect(ref.current).toBe(backdrop);
  });
});
