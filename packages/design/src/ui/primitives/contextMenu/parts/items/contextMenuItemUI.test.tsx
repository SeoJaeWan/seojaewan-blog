import { createRef, type ReactNode } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuItemUI } from "./contextMenuItemUI";

afterEach(cleanupUITest);

const renderItem = async (item: ReactNode) => {
  renderUITest(
    <ContextMenuRootUI>
      <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
      <ContextMenuContentUI aria-label="설정 메뉴">{item}</ContextMenuContentUI>
    </ContextMenuRootUI>,
  );
  fireEvent.contextMenu(screen.getByText("설정 surface"));
  await screen.findByRole("menu", { name: "설정 메뉴" });
};

describe("ContextMenuItemUI", () => {
  it("menuitem 역할·이름·variant·prop·className·ref·선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    await renderItem(
      <ContextMenuItemUI
        className="custom-item"
        data-testid="item"
        onClick={onClick}
        ref={ref}
        variant="danger"
      >
        삭제
      </ContextMenuItemUI>,
    );

    const item = screen.getByRole("menuitem", { name: "삭제" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.classList.contains("custom-item")).toBe(true);
    expect(ref.current).toBe(item);
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled 상태에서는 선택 callback을 실행하지 않는다", async () => {
    const onClick = vi.fn();
    await renderItem(
      <ContextMenuItemUI disabled onClick={onClick}>
        사용할 수 없음
      </ContextMenuItemUI>,
    );

    const item = screen.getByRole("menuitem", { name: "사용할 수 없음" });
    fireEvent.click(item);
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });
});
