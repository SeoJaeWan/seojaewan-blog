import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { DialogUI } from "./dialogUI";

afterEach(cleanupUITest);

describe("DialogUI", () => {
  it("Portal 안의 Content에 Backdrop, Title과 Description을 조합한다", async () => {
    renderUITest(
      <DialogUI defaultOpen>
        <DialogUI.Portal>
          <DialogUI.Backdrop data-testid="backdrop" />
          <DialogUI.Content>
            <DialogUI.Title>설정</DialogUI.Title>
            <DialogUI.Description>환경 설정을 변경합니다.</DialogUI.Description>
          </DialogUI.Content>
        </DialogUI.Portal>
      </DialogUI>,
    );

    const content = await screen.findByRole("dialog", { name: "설정" });
    const title = screen.getByText("설정");
    const description = screen.getByText("환경 설정을 변경합니다.");

    expect(screen.getByTestId("backdrop")).not.toBeNull();
    expect(content.getAttribute("aria-modal")).toBe("true");
    expect(content.getAttribute("aria-labelledby")).toContain(title.id);
    expect(content.getAttribute("aria-describedby")).toContain(description.id);
  });
});
