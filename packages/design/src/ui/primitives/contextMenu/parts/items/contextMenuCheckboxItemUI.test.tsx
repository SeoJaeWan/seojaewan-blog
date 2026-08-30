import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuCheckboxItemUI } from "./contextMenuCheckboxItemUI";

afterEach(cleanupUITest);

const renderCheckbox = async (props: Parameters<typeof ContextMenuCheckboxItemUI>[0]) => {
  renderUITest(
    <ContextMenuRootUI>
      <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
      <ContextMenuContentUI aria-label="설정 메뉴">
        <ContextMenuCheckboxItemUI {...props} />
      </ContextMenuContentUI>
    </ContextMenuRootUI>,
  );
  fireEvent.contextMenu(screen.getByText("설정 surface"));
  await screen.findByRole("menu", { name: "설정 메뉴" });
};

describe("ContextMenuCheckboxItemUI", () => {
  it("선택 상태를 바꾸면 변경을 알린다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onCheckedChange = vi.fn();
    await renderCheckbox({
      children: "고정",
      defaultChecked: true,
      icon: <span data-testid="checkbox-icon">장식 아이콘</span>,
      onCheckedChange,
      ref,
      trailing: <kbd data-testid="checkbox-trailing">Ctrl+P</kbd>,
    });

    const item = screen.getByRole("menuitemcheckbox", { name: "고정" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.classList.contains("wd-context-menu-ui__item")).toBe(true);
    expect(item.querySelector('svg[width="12"]')).not.toBeNull();
    expect(item.querySelector(".wd-context-menu-ui__item-indicator")).not.toBeNull();
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

  it("controlled 상태에서는 요청을 보고하고 외부 checked 값을 유지한다", async () => {
    const onCheckedChange = vi.fn();
    await renderCheckbox({ checked: true, children: "고정 선택", onCheckedChange });

    const item = screen.getByRole("menuitemcheckbox", { name: "고정 선택" });
    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(item.getAttribute("aria-checked")).toBe("true");
  });
});
