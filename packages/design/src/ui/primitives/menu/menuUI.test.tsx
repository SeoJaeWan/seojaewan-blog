import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { MenuUI } from "./menuUI";

afterEach(cleanupUITest);

describe("MenuUI compound 조합", () => {
  it("구조·항목·중첩 part를 하나의 MenuUI 경로로 조합한다", () => {
    renderUITest(
      <MenuUI.Root defaultOpen>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content aria-label="작업 메뉴">
          <MenuUI.Item>열기</MenuUI.Item>
          <MenuUI.CheckboxItem defaultChecked>고정</MenuUI.CheckboxItem>
          <MenuUI.RadioGroup defaultValue="보통">
            <MenuUI.RadioItem value="보통">보통</MenuUI.RadioItem>
          </MenuUI.RadioGroup>
          <MenuUI.Separator />
          <MenuUI.Submenu.Root>
            <MenuUI.Submenu.Trigger>공유</MenuUI.Submenu.Trigger>
            <MenuUI.Submenu.Content>
              <MenuUI.Item>메일</MenuUI.Item>
            </MenuUI.Submenu.Content>
          </MenuUI.Submenu.Root>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    expect(screen.getByRole("menu", { name: "작업 메뉴" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "열기" })).toBeTruthy();
    expect(screen.getByRole("menuitemcheckbox", { name: "고정" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "보통" })).toBeTruthy();
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "공유" })).toBeTruthy();
  });
});
