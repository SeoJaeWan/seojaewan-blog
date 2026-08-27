import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import typesSource from "./icon-button-ui.types.ts?raw";
import { IconButtonUI } from "./index";
import indexSource from "./index.ts?raw";

afterEach(() => {
  cleanupUITest();
});

describe("IconButtonUI", () => {
  it("필수 label을 native button의 이름으로 사용한다", () => {
    const view = renderUITest(<IconButtonUI icon={<span>decorative</span>} label="Add item" />);
    const button = view.getByRole("button", { name: "Add item" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Add item");
    expect(button.textContent).toBe("decorative");
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("native keyboard activation을 사용하고 disabled 상태에서는 동작하지 않는다", async () => {
    const enabledAction = vi.fn();
    const disabledAction = vi.fn();
    const user = userEvent.setup();
    const view = renderUITest(
      <>
        <IconButtonUI icon="+" label="Add" onClick={enabledAction} />
        <IconButtonUI disabled icon="-" label="Remove" onClick={disabledAction} />
      </>,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await user.click(view.getByRole("button", { name: "Remove" }));

    expect(enabledAction).toHaveBeenCalledOnce();
    expect(disabledAction).not.toHaveBeenCalled();
  });

  it("프로젝트 공개 경계에서 Base UI 타입을 노출하지 않는다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
