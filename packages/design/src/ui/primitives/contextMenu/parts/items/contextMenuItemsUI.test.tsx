import { createRef, type ReactNode } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuUI } from "../../contextMenuUI";

afterEach(cleanupUITest);

const renderOpenContextMenu = async (children: ReactNode) => {
  renderUITest(
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger>설정 surface</ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="설정 메뉴">{children}</ContextMenuUI.Content>
    </ContextMenuUI.Root>,
  );
  fireEvent.contextMenu(screen.getByText("설정 surface"));
  await screen.findByRole("menu", { name: "설정 메뉴" });
};

describe("ContextMenuUI 항목 part", () => {
  it("Item이 menuitem role·이름·variant·prop·ref·선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.Item
        className="custom-item"
        data-testid="item"
        onClick={onClick}
        ref={ref}
        variant="danger"
      >
        삭제
      </ContextMenuUI.Item>,
    );

    const item = screen.getByRole("menuitem", { name: "삭제" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.classList.contains("custom-item")).toBe(true);
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("CheckboxItem이 기본 checked state와 project callback을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onCheckedChange = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.CheckboxItem defaultChecked onCheckedChange={onCheckedChange} ref={ref}>
        고정
      </ContextMenuUI.CheckboxItem>,
    );

    const item = screen.getByRole("menuitemcheckbox", { name: "고정" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("RadioGroup이 기본값과 변경 callback을 구성한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.RadioGroup defaultValue="편안함" onValueChange={onValueChange} ref={ref}>
        <ContextMenuUI.RadioItem value="조밀함">조밀함</ContextMenuUI.RadioItem>
        <ContextMenuUI.RadioItem value="편안함">편안함</ContextMenuUI.RadioItem>
      </ContextMenuUI.RadioGroup>,
    );

    expect(ref.current?.classList.contains("wd-menu-ui__radio-group")).toBe(true);
    expect(screen.getByRole("menuitemradio", { name: "편안함" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "조밀함" }));
    expect(onValueChange).toHaveBeenCalledWith("조밀함", { reason: "item-press" });
  });

  it("RadioItem이 값별 role·이름·state·variant·ref 계약을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    await renderOpenContextMenu(
      <ContextMenuUI.RadioGroup defaultValue="위험">
        <ContextMenuUI.RadioItem ref={ref} value="위험" variant="danger">
          위험
        </ContextMenuUI.RadioItem>
      </ContextMenuUI.RadioGroup>,
    );

    const item = screen.getByRole("menuitemradio", { name: "위험" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(ref.current).toBe(item);
  });

  it("Separator가 기본 horizontal 의미·prop·ref 계약을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    await renderOpenContextMenu(<ContextMenuUI.Separator className="custom-separator" ref={ref} />);

    const separator = screen.getByRole("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.classList.contains("custom-separator")).toBe(true);
    expect(ref.current).toBe(separator);
  });

  it("disabled Item은 callback을 실행하지 않는다", async () => {
    const onClick = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.Item disabled onClick={onClick}>
        사용할 수 없음
      </ContextMenuUI.Item>,
    );

    const item = screen.getByRole("menuitem", { name: "사용할 수 없음" });
    fireEvent.click(item);
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("controlled CheckboxItem은 요청을 보고하되 외부 checked 값을 바꾸지 않는다", async () => {
    const onCheckedChange = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.CheckboxItem checked onCheckedChange={onCheckedChange}>
        고정 선택
      </ContextMenuUI.CheckboxItem>,
    );

    const item = screen.getByRole("menuitemcheckbox", { name: "고정 선택" });
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(item.getAttribute("aria-checked")).toBe("true");
  });

  it("이미 선택된 RadioItem을 다시 누르면 같은 값의 재선택을 보고한다", async () => {
    const onValueChange = vi.fn();
    await renderOpenContextMenu(
      <ContextMenuUI.RadioGroup defaultValue="현재" onValueChange={onValueChange}>
        <ContextMenuUI.RadioItem closeOnSelect={false} value="현재">
          현재
        </ContextMenuUI.RadioItem>
      </ContextMenuUI.RadioGroup>,
    );

    fireEvent.click(screen.getByRole("menuitemradio", { name: "현재" }));
    expect(onValueChange).toHaveBeenCalledWith("현재", { reason: "item-press" });
  });
});
