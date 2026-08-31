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

  it("sm, md, lg size 계약과 md 기본값을 data state로 제공한다", () => {
    const view = renderUITest(
      <>
        <IconButtonUI icon="S" label="작게" size="sm" />
        <IconButtonUI icon="M" label="기본" />
        <IconButtonUI icon="L" label="크게" size="lg" />
      </>,
    );

    expect(view.getByRole("button", { name: "작게" }).getAttribute("data-size")).toBe("sm");
    expect(view.getByRole("button", { name: "기본" }).getAttribute("data-size")).toBe("md");
    expect(view.getByRole("button", { name: "크게" }).getAttribute("data-size")).toBe("lg");
  });

  it("selected에서 aria-pressed와 data-selected를 함께 파생한다", () => {
    const view = renderUITest(
      <>
        <IconButtonUI icon="A" label="선택 안 됨" />
        <IconButtonUI icon="B" label="선택됨" selected />
      </>,
    );
    const unselected = view.getByRole("button", { name: "선택 안 됨" });
    const selected = view.getByRole("button", { name: "선택됨" });

    expect(unselected.hasAttribute("aria-pressed")).toBe(false);
    expect(unselected.hasAttribute("data-selected")).toBe(false);
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.getAttribute("data-selected")).toBe("true");
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
