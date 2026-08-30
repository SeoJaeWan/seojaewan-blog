import { createRef, type ReactNode } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuRadioGroupUI } from "./contextMenuRadioGroupUI";
import { ContextMenuRadioItemUI } from "./contextMenuRadioItemUI";

afterEach(cleanupUITest);

const renderGroup = async (group: ReactNode) => {
  renderUITest(
    <ContextMenuRootUI>
      <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
      <ContextMenuContentUI aria-label="설정 메뉴">{group}</ContextMenuContentUI>
    </ContextMenuRootUI>,
  );
  fireEvent.contextMenu(screen.getByText("설정 surface"));
  await screen.findByRole("menu", { name: "설정 메뉴" });
};

describe("ContextMenuRadioGroupUI", () => {
  it("선택한 값을 바꾸면 변경을 알린다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    await renderGroup(
      <ContextMenuRadioGroupUI defaultValue="편안함" onValueChange={onValueChange} ref={ref}>
        <ContextMenuRadioItemUI value="조밀함">조밀함</ContextMenuRadioItemUI>
        <ContextMenuRadioItemUI value="편안함">편안함</ContextMenuRadioItemUI>
      </ContextMenuRadioGroupUI>,
    );

    expect(ref.current?.classList.contains("wd-menu-ui__radio-group")).toBe(true);
    expect(screen.getByRole("menuitemradio", { name: "편안함" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "조밀함" }));
    expect(onValueChange).toHaveBeenCalledWith("조밀함", { reason: "item-press" });
  });

  it("선택한 값을 다시 누르면 같은 값의 재선택을 보고한다", async () => {
    const onValueChange = vi.fn();
    await renderGroup(
      <ContextMenuRadioGroupUI defaultValue="현재" onValueChange={onValueChange}>
        <ContextMenuRadioItemUI closeOnSelect={false} value="현재">
          현재
        </ContextMenuRadioItemUI>
      </ContextMenuRadioGroupUI>,
    );

    fireEvent.click(screen.getByRole("menuitemradio", { name: "현재" }));
    expect(onValueChange).toHaveBeenCalledWith("현재", { reason: "item-press" });
  });
});
