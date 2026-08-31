import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { DialogPortalUI } from "./dialogPortalUI";
import { DialogRootUI } from "./dialogRootUI";

afterEach(cleanupUITest);

describe("DialogPortalUI", () => {
  it("열린 Root에서 기본 className을 가진 portal container를 렌더링한다", async () => {
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI data-testid="dialog-portal">portal content</DialogPortalUI>
      </DialogRootUI>,
    );
    const portal = await screen.findByTestId("dialog-portal");

    expect(portal.classList.contains("wd-dialog-ui__portal")).toBe(true);
    expect(portal.textContent).toBe("portal content");
  });

  it("native prop, className과 ref를 portal container에 전달한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <DialogRootUI defaultOpen>
        <DialogPortalUI className="settings-portal" data-layer="dialog" ref={ref}>
          portal content
        </DialogPortalUI>
      </DialogRootUI>,
    );
    const portal = await screen.findByText("portal content");

    expect(portal.classList.contains("settings-portal")).toBe(true);
    expect(portal.getAttribute("data-layer")).toBe("dialog");
    expect(ref.current).toBe(portal);
  });
});
