import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { PopoverUI } from "./popoverUI";

afterEach(cleanupUITest);

describe("PopoverUI", () => {
  it("Content에 Title과 Description의 접근성 관계를 조합한다", async () => {
    renderUITest(
      <PopoverUI defaultOpen>
        <PopoverUI.Trigger>계정</PopoverUI.Trigger>
        <PopoverUI.Content>
          <PopoverUI.Title>계정 정보</PopoverUI.Title>
          <PopoverUI.Description>로그인한 계정을 관리합니다.</PopoverUI.Description>
        </PopoverUI.Content>
      </PopoverUI>,
    );

    const content = await screen.findByRole("dialog", { name: "계정 정보" });
    const title = screen.getByText("계정 정보");
    const description = screen.getByText("로그인한 계정을 관리합니다.");

    expect(content.getAttribute("aria-labelledby")).toContain(title.id);
    expect(content.getAttribute("aria-describedby")).toContain(description.id);
  });
});
