import { createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { ButtonUI } from "./buttonUI";

afterEach(() => {
  cleanupUITest();
});

describe("ButtonUI", () => {
  it("기본 type을 button으로 설정한다", () => {
    const view = renderUITest(<ButtonUI>변경 저장</ButtonUI>);
    const button = view.getByRole("button", { name: "변경 저장" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("className과 native props를 button에 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <ButtonUI className="save-button" data-action="save" name="intent" ref={ref} value="save">
        변경 저장
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "변경 저장" });

    expect(button.className).toContain("wd-button-ui");
    expect(button.className).toContain("save-button");
    expect(button.getAttribute("data-action")).toBe("save");
    expect(button.getAttribute("name")).toBe("intent");
    expect(button.getAttribute("value")).toBe("save");
  });

  it("전달한 ref를 native button에 연결한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(<ButtonUI ref={ref}>창 열기</ButtonUI>);
    const button = view.getByRole("button", { name: "창 열기" });

    expect(ref.current).toBe(button);
  });

  it("명시한 type을 유지한다", () => {
    const view = renderUITest(<ButtonUI type="submit">폼 제출</ButtonUI>);
    const button = view.getByRole("button", { name: "폼 제출" });

    expect(button.getAttribute("type")).toBe("submit");
  });

  it("click callback을 실행한다", () => {
    const onClick = vi.fn();
    const view = renderUITest(<ButtonUI onClick={onClick}>폼 제출</ButtonUI>);
    const button = view.getByRole("button", { name: "폼 제출" });

    button.click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled 상태에서는 click callback을 실행하지 않는다", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <ButtonUI disabled onClick={onClick}>
        삭제
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "삭제" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
