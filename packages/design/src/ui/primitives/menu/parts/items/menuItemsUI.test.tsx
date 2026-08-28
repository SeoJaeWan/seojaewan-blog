import { createRef, type ReactNode } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuUI } from "../../menuUI";

afterEach(cleanupUITest);

const renderOpenMenu = (children: ReactNode) =>
  renderUITest(
    <MenuUI.Root defaultOpen>
      <MenuUI.Trigger>설정</MenuUI.Trigger>
      <MenuUI.Content aria-label="설정 메뉴">{children}</MenuUI.Content>
    </MenuUI.Root>,
  );

describe("MenuUI 항목 part", () => {
  it("Item이 menuitem role·이름·variant·prop·ref·선택 callback을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    renderOpenMenu(
      <MenuUI.Item
        className="custom-item"
        data-testid="item"
        onClick={onClick}
        ref={ref}
        variant="danger"
      >
        삭제
      </MenuUI.Item>,
    );

    const item = screen.getByRole("menuitem", { name: "삭제" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.classList.contains("custom-item")).toBe(true);
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("CheckboxItem이 기본 checked state와 project callback을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onCheckedChange = vi.fn();
    renderOpenMenu(
      <MenuUI.CheckboxItem defaultChecked onCheckedChange={onCheckedChange} ref={ref}>
        세부 정보
      </MenuUI.CheckboxItem>,
    );

    const item = screen.getByRole("menuitemcheckbox", { name: "세부 정보" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("RadioGroup이 기본값과 변경 callback을 구성한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    renderOpenMenu(
      <MenuUI.RadioGroup defaultValue="편안함" onValueChange={onValueChange} ref={ref}>
        <MenuUI.RadioItem value="조밀함">조밀함</MenuUI.RadioItem>
        <MenuUI.RadioItem value="편안함">편안함</MenuUI.RadioItem>
      </MenuUI.RadioGroup>,
    );

    expect(ref.current?.classList.contains("wd-menu-ui__radio-group")).toBe(true);
    expect(screen.getByRole("menuitemradio", { name: "편안함" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "조밀함" }));
    expect(onValueChange).toHaveBeenCalledWith("조밀함", { reason: "item-press" });
  });

  it("RadioItem이 값별 role·이름·state·variant·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderOpenMenu(
      <MenuUI.RadioGroup defaultValue="위험">
        <MenuUI.RadioItem ref={ref} value="위험" variant="danger">
          위험
        </MenuUI.RadioItem>
      </MenuUI.RadioGroup>,
    );

    const item = screen.getByRole("menuitemradio", { name: "위험" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(ref.current).toBe(item);
  });

  it("Separator가 기본 horizontal 의미·prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderOpenMenu(<MenuUI.Separator className="custom-separator" ref={ref} />);

    const separator = screen.getByRole("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.classList.contains("custom-separator")).toBe(true);
    expect(ref.current).toBe(separator);
  });

  it("disabled Item은 callback을 실행하지 않는다", () => {
    const onClick = vi.fn();
    renderOpenMenu(
      <MenuUI.Item disabled onClick={onClick}>
        사용할 수 없음
      </MenuUI.Item>,
    );

    const item = screen.getByRole("menuitem", { name: "사용할 수 없음" });
    fireEvent.click(item);
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("controlled CheckboxItem은 요청을 보고하되 외부 checked 값을 바꾸지 않는다", () => {
    const onCheckedChange = vi.fn();
    renderOpenMenu(
      <MenuUI.CheckboxItem checked onCheckedChange={onCheckedChange}>
        고정 선택
      </MenuUI.CheckboxItem>,
    );

    const item = screen.getByRole("menuitemcheckbox", { name: "고정 선택" });
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(item.getAttribute("aria-checked")).toBe("true");
  });

  it("이미 선택된 RadioItem을 다시 누르면 같은 값의 재선택을 보고한다", () => {
    const onValueChange = vi.fn();
    renderOpenMenu(
      <MenuUI.RadioGroup defaultValue="현재" onValueChange={onValueChange}>
        <MenuUI.RadioItem closeOnSelect={false} value="현재">
          현재
        </MenuUI.RadioItem>
      </MenuUI.RadioGroup>,
    );

    fireEvent.click(screen.getByRole("menuitemradio", { name: "현재" }));
    expect(onValueChange).toHaveBeenCalledWith("현재", { reason: "item-press" });
  });
});
