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

    expect(view.getAllByRole("button")).toHaveLength(1);
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

  it("anchor 구성을 단일 native link로 렌더링하고 props, ref와 callback을 보존한다", () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLAnchorElement>();
    const view = renderUITest(
      <ButtonUI
        className="folder-link"
        data-surface="existing-folder"
        href="#existing-folder"
        onClick={onClick}
        ref={ref}
        render="anchor"
      >
        Existing Folder 열기
      </ButtonUI>,
    );
    const link = view.getByRole("link", { name: "Existing Folder 열기" });

    expect(view.getAllByRole("link")).toHaveLength(1);
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("#existing-folder");
    expect(link.getAttribute("data-surface")).toBe("existing-folder");
    expect(link.className).toContain("wd-button-ui");
    expect(link.className).toContain("folder-link");
    expect(ref.current).toBe(link);

    link.click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled anchor 구성을 접근성 상태로 노출하고 activation을 차단한다", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <ButtonUI disabled href="#existing-folder" onClick={onClick} render="anchor">
        Existing Folder 열기
      </ButtonUI>,
    );
    const link = view.getByRole("link", { name: "Existing Folder 열기" });

    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("data-disabled")).toBe("");
    expect(link.getAttribute("tabindex")).toBe("-1");

    link.click();

    expect(onClick).not.toHaveBeenCalled();
  });
});
