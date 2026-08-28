import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuItemUI } from "../items/contextMenuItemUI";
import { ContextMenuContentUI } from "./contextMenuContentUI";
import { ContextMenuRootUI } from "./contextMenuRootUI";
import { ContextMenuTriggerUI } from "./contextMenuTriggerUI";

afterEach(cleanupUITest);

describe("ContextMenuContentUI", () => {
  it("menu 역할·이름·className·DOM prop·ref를 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>문서</ContextMenuTriggerUI>
        <ContextMenuContentUI
          aria-label="명명된 문서 메뉴"
          className="custom-content"
          data-testid="content"
          ref={ref}
        >
          <ContextMenuItemUI>열기</ContextMenuItemUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );

    fireEvent.contextMenu(screen.getByText("문서"));
    const content = await screen.findByRole("menu", { name: "명명된 문서 메뉴" });
    expect(content).toBe(screen.getByTestId("content"));
    expect(content.classList.contains("custom-content")).toBe(true);
    expect(ref.current).toBe(content);
  });
});
