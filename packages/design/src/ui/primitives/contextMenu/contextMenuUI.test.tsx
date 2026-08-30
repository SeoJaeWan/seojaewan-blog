import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { ContextMenuUI } from "./contextMenuUI";

afterEach(cleanupUITest);

describe("ContextMenuUI compound 조합", () => {
  it("오른쪽 클릭으로 모든 메뉴 항목을 표시한다", async () => {
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>문서 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="문서 메뉴">
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
          <ContextMenuUI.CheckboxItem defaultChecked>고정</ContextMenuUI.CheckboxItem>
          <ContextMenuUI.RadioGroup defaultValue="보통">
            <ContextMenuUI.RadioItem value="보통">보통</ContextMenuUI.RadioItem>
          </ContextMenuUI.RadioGroup>
          <ContextMenuUI.Separator />
          <ContextMenuUI.Submenu.Root>
            <ContextMenuUI.Submenu.Trigger>공유</ContextMenuUI.Submenu.Trigger>
            <ContextMenuUI.Submenu.Content>
              <ContextMenuUI.Item>메일</ContextMenuUI.Item>
            </ContextMenuUI.Submenu.Content>
          </ContextMenuUI.Submenu.Root>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("문서 surface"));
    const content = await screen.findByRole("menu", { name: "문서 메뉴" });
    expect(content.classList.contains("wd-menu-ui__content")).toBe(true);
    expect(content.classList.contains("wd-context-menu-ui__content")).toBe(true);
    expect(
      screen.getByRole("menuitem", { name: "열기" }).classList.contains("wd-context-menu-ui__item"),
    ).toBe(true);
    expect(screen.getByRole("menuitemcheckbox", { name: "고정" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "보통" })).toBeTruthy();
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "공유" })).toBeTruthy();
  });
});
