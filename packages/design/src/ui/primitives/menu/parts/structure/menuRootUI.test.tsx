import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuItemUI } from "../items/menuItemUI";
import { MenuContentUI } from "./menuContentUI";
import { MenuRootUI } from "./menuRootUI";
import { MenuTriggerUI } from "./menuTriggerUI";

afterEach(cleanupUITest);

const RootFixture = (props: Partial<Parameters<typeof MenuRootUI>[0]>) => (
  <MenuRootUI {...props}>
    <MenuTriggerUI>작업</MenuTriggerUI>
    <MenuContentUI aria-label="작업 메뉴">
      <MenuItemUI>열기</MenuItemUI>
    </MenuContentUI>
  </MenuRootUI>
);

describe("MenuRootUI", () => {
  it("기본 열림 상태와 변경 callback을 하위 메뉴에 제공한다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture defaultOpen onOpenChange={onOpenChange} />);

    expect(screen.getByRole("menu", { name: "작업 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "열기" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("disabled 상태에서는 trigger를 눌러도 열리지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture disabled onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "작업" }));
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("controlled 상태에서는 요청을 보고하고 외부 open 값을 유지한다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture onOpenChange={onOpenChange} open={false} />);

    fireEvent.click(screen.getByRole("button", { name: "작업" }));
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
  });
});
