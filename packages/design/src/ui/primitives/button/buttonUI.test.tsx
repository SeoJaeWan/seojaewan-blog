import { createRef } from "react";

import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { ButtonUI } from "./buttonUI";
import typesSource from "./buttonUI.types.ts?raw";
import indexSource from "./index.ts?raw";

afterEach(() => {
  cleanupUITest();
});

describe("ButtonUI", () => {
  it("기본 type과 className, ref, native props를 button에 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <ButtonUI className="save-button" data-action="save" name="intent" ref={ref} value="save">
        Save changes
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "Save changes" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(ref.current).toBe(button);
    expect(button.className).toContain("wd-button-ui");
    expect(button.className).toContain("save-button");
    expect(button.getAttribute("data-action")).toBe("save");
    expect(button.getAttribute("name")).toBe("intent");
    expect(button.getAttribute("value")).toBe("save");
  });

  it("명시한 type을 유지하고 click handler를 실행한다", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const view = renderUITest(
      <ButtonUI onClick={onClick} type="submit">
        Submit form
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "Submit form" });

    await user.click(button);

    expect(button.getAttribute("type")).toBe("submit");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("Enter와 Space에 native keyboard activation을 사용한다", async () => {
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

  it("disabled 상태에서는 action을 실행하지 않는다", async () => {
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

  it("프로젝트 공개 경계에서 Base UI 타입을 노출하지 않는다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
