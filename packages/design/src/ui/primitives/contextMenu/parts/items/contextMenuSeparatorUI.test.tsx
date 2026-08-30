import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuSeparatorUI } from "./contextMenuSeparatorUI";

afterEach(cleanupUITest);

describe("ContextMenuSeparatorUI", () => {
  it("항목 사이를 가로로 구분한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuSeparatorUI className="custom-separator" ref={ref} />
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );
    fireEvent.contextMenu(screen.getByText("설정 surface"));

    const separator = await screen.findByRole("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.classList.contains("custom-separator")).toBe(true);
    expect(ref.current).toBe(separator);
  });
});
