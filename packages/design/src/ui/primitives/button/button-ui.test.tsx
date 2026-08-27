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
  it("이름 있는 native button을 렌더링하고 기본 type을 설정한다", () => {
    const ref = { current: null as HTMLButtonElement | null };
    const view = renderUITest(<ButtonUI ref={ref}>Save changes</ButtonUI>);
    const button = view.getByRole("button", { name: "Save changes" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(ref.current).toBe(button);
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
