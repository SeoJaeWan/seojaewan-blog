import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import typesSource from "./button-ui.types.ts?raw";
import { ButtonUI } from "./index";
import indexSource from "./index.ts?raw";

afterEach(() => {
  cleanupUITest();
});

describe("ButtonUI", () => {
  it("renders a named native button and defaults its type", () => {
    const ref = { current: null as HTMLButtonElement | null };
    const view = renderUITest(<ButtonUI ref={ref}>Save changes</ButtonUI>);
    const button = view.getByRole("button", { name: "Save changes" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(ref.current).toBe(button);
  });

  it("uses intrinsic keyboard activation for Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const view = renderUITest(<ButtonUI onClick={onClick}>Run action</ButtonUI>);
    const button = view.getByRole("button", { name: "Run action" });

    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not invoke actions while disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const view = renderUITest(
      <ButtonUI disabled onClick={onClick}>
        Delete
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "Delete" });

    await user.click(button);

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps Base UI types out of its project-owned public boundary", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
