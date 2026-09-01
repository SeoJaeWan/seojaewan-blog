import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuItemUI } from "../items/contextMenuItemUI";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuSubmenuContentUI } from "./contextMenuSubmenuContentUI";
import { ContextMenuSubmenuRootUI } from "./contextMenuSubmenuRootUI";
import { ContextMenuSubmenuTriggerUI } from "./contextMenuSubmenuTriggerUI";

afterEach(cleanupUITest);

describe("ContextMenuSubmenuRootUI", () => {
  it("독립 기본 열림 상태와 변경 callback을 제공한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>작업 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuSubmenuRootUI defaultOpen onOpenChange={onOpenChange}>
            <ContextMenuSubmenuTriggerUI>공유</ContextMenuSubmenuTriggerUI>
            <ContextMenuSubmenuContentUI aria-label="공유 메뉴">
              <ContextMenuItemUI>메일</ContextMenuItemUI>
            </ContextMenuSubmenuContentUI>
          </ContextMenuSubmenuRootUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));

    expect(await screen.findByRole("menu", { name: "공유 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });
});
