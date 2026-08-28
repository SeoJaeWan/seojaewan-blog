import { createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { IconButtonUI } from "./iconButtonUI";

afterEach(() => {
  cleanupUITest();
});

describe("IconButtonUI", () => {
  it("필수 label을 native button의 이름으로 사용한다", () => {
    const view = renderUITest(<IconButtonUI icon={<span>장식</span>} label="항목 추가" />);
    const button = view.getByRole("button", { name: "항목 추가" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("항목 추가");
    expect(button.textContent).toBe("장식");
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("className과 명시한 type을 포함한 native props를 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <IconButtonUI
        className="add-button"
        data-action="add"
        icon="+"
        label="항목 추가"
        name="intent"
        ref={ref}
        type="submit"
      />,
    );
    const button = view.getByRole("button", { name: "항목 추가" });

    expect(button.className).toContain("wd-icon-button-ui");
    expect(button.className).toContain("add-button");
    expect(button.getAttribute("data-action")).toBe("add");
    expect(button.getAttribute("name")).toBe("intent");
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("전달한 ref를 native button에 연결한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(<IconButtonUI icon="+" label="항목 추가" ref={ref} />);
    const button = view.getByRole("button", { name: "항목 추가" });

    expect(ref.current).toBe(button);
  });

  it("click callback을 실행한다", () => {
    const onClick = vi.fn();
    const view = renderUITest(<IconButtonUI icon="+" label="항목 추가" onClick={onClick} />);

    view.getByRole("button", { name: "항목 추가" }).click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled 상태에서는 click callback을 실행하지 않는다", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <IconButtonUI disabled icon="-" label="항목 제거" onClick={onClick} />,
    );
    const button = view.getByRole("button", { name: "항목 제거" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
