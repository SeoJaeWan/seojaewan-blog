import { createRef, type ReactNode } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuItemUI } from "./menuItemUI";

afterEach(cleanupUITest);

const renderItem = (item: ReactNode) =>
  renderUITest(
    <MenuRootUI defaultOpen>
      <MenuTriggerUI>설정</MenuTriggerUI>
      <MenuContentUI>{item}</MenuContentUI>
    </MenuRootUI>,
  );

describe("MenuItemUI", () => {
  it("항목을 누르면 선택을 알린다", () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    renderItem(
      <MenuItemUI
        className="custom-item"
        data-testid="item"
        icon={<span data-testid="item-icon">장식 아이콘</span>}
        onClick={onClick}
        ref={ref}
        trailing={<kbd data-testid="item-trailing">Del</kbd>}
        variant="danger"
      >
        삭제
      </MenuItemUI>,
    );

    const item = screen.getByRole("menuitem", { name: "삭제" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.classList.contains("custom-item")).toBe(true);
    expect(screen.getByTestId("item-icon").parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByTestId("item-icon").parentElement?.classList).toContain(
      "wd-menu-ui__item-icon",
    );
    expect(screen.getByTestId("item-trailing").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("item-trailing").parentElement?.classList).toContain(
      "wd-menu-ui__item-trailing",
    );
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled 상태에서는 선택 callback을 실행하지 않는다", () => {
    const onClick = vi.fn();
    renderItem(
      <MenuItemUI disabled onClick={onClick}>
        사용할 수 없음
      </MenuItemUI>,
    );

    const item = screen.getByRole("menuitem", { name: "사용할 수 없음" });
    fireEvent.click(item);
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });
});
