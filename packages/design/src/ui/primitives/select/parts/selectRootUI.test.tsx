import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import { SelectLabelUI } from "./control/selectLabelUI";
import { SelectTriggerUI } from "./control/selectTriggerUI";
import { SelectValueUI } from "./control/selectValueUI";
import { SelectContentUI } from "./options/selectContentUI";
import { SelectItemUI } from "./options/selectItemUI";
import { SelectListUI } from "./options/selectListUI";
import { SelectRootUI, toSelectUIChangeDetails } from "./selectRootUI";

afterEach(cleanupUITest);

const options = [
  { label: "바탕 화면", value: "desktop" },
  { label: "문서", value: "documents" },
] as const;

const RootFixture = (props: Partial<Parameters<typeof SelectRootUI>[0]>) => (
  <SelectRootUI items={options} {...props}>
    <SelectLabelUI>태그</SelectLabelUI>
    <SelectTriggerUI>
      <SelectValueUI placeholder="선택" />
    </SelectTriggerUI>
    <SelectContentUI>
      <SelectListUI>
        {options.map((option) => (
          <SelectItemUI key={option.value} value={option.value}>
            {option.label}
          </SelectItemUI>
        ))}
      </SelectListUI>
    </SelectContentUI>
  </SelectRootUI>
);

describe("SelectRootUI", () => {
  it("vendor 세부 정보에서 clear action과 분리된 새 프로젝트 snapshot을 만든다", () => {
    const details = { reason: "item-press" } as const;
    const result = toSelectUIChangeDetails(details);

    expect(result).toEqual({ reason: "item-press" });
    expect(result).not.toBe(details);
    expectTypeOf<string>().not.toMatchTypeOf<Parameters<typeof toSelectUIChangeDetails>[0]>();
    expectTypeOf<{ reason: "clear-press" }>().not.toMatchTypeOf<
      Parameters<typeof toSelectUIChangeDetails>[0]
    >();
  });

  it("기본값과 이름을 하위 part에 제공하고 uncontrolled 값을 갱신한다", async () => {
    const user = userEvent.setup();
    renderUITest(<RootFixture defaultOpen defaultValue="desktop" name="tag" />);

    const trigger = screen.getByRole("combobox", { name: "태그" });
    expect(trigger.textContent).toContain("바탕 화면");
    expect(document.querySelector('input[name="tag"]')).toBeTruthy();

    await user.click(screen.getByRole("option", { name: "문서" }));
    await waitFor(() => expect(trigger.textContent).toContain("문서"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("controlled 값은 직접 바꾸지 않고 프로젝트 변경 이유로 callback을 보고한다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(<RootFixture defaultOpen onValueChange={onValueChange} value="desktop" />);

    await user.click(screen.getByRole("option", { name: "문서" }));

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("documents", { reason: "item-press" }),
    );
    expect(screen.getByRole("combobox", { name: "태그" }).textContent).toContain("바탕 화면");
  });

  it("readOnly 상태에서는 값 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(<RootFixture defaultOpen onValueChange={onValueChange} readOnly />);

    expect(screen.getByRole("combobox", { name: "태그" }).getAttribute("aria-readonly")).toBe(
      "true",
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
