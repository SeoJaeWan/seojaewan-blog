import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuCheckboxItemUI } from "./menuCheckboxItemUI";

afterEach(cleanupUITest);

const renderCheckbox = (props: Parameters<typeof MenuCheckboxItemUI>[0]) =>
  renderUITest(
    <MenuRootUI defaultOpen>
      <MenuTriggerUI>설정</MenuTriggerUI>
      <MenuContentUI>
        <MenuCheckboxItemUI {...props} />
      </MenuContentUI>
    </MenuRootUI>,
  );

describe("MenuCheckboxItemUI", () => {
  it("기본 checked 상태·이름·ref와 프로젝트 변경 callback을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onCheckedChange = vi.fn();
    renderCheckbox({
      children: "세부 정보",
      defaultChecked: true,
      icon: <span data-testid="checkbox-icon">장식 아이콘</span>,
      onCheckedChange,
      ref,
      trailing: <kbd data-testid="checkbox-trailing">Ctrl+D</kbd>,
    });

    const item = screen.getByRole("menuitemcheckbox", { name: "세부 정보" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.querySelector('svg[width="12"]')).not.toBeNull();
    expect(item.querySelector(".wd-menu-ui__item-indicator")).not.toBeNull();
    expect(screen.getByTestId("checkbox-icon").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("checkbox-trailing").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("controlled 상태에서는 요청을 보고하고 외부 checked 값을 유지한다", () => {
    const onCheckedChange = vi.fn();
    renderCheckbox({ checked: true, children: "고정 선택", onCheckedChange });

    const item = screen.getByRole("menuitemcheckbox", { name: "고정 선택" });
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(item.getAttribute("aria-checked")).toBe("true");
  });
});
