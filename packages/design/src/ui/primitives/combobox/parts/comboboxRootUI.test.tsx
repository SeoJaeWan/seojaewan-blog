import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../testing";
import type { ComboboxUIChangeDetails } from "../comboboxUI.types";
import { ComboboxRootUI, toComboboxUIChangeDetails } from "./comboboxRootUI";
import { ComboboxInputUI } from "./control/comboboxInputUI";
import { ComboboxLabelUI } from "./control/comboboxLabelUI";
import { ComboboxContentUI } from "./options/comboboxContentUI";
import { ComboboxListUI } from "./options/comboboxListUI";

afterEach(cleanupUITest);

const options = [
  { label: "바탕 화면", value: "desktop" },
  { label: "문서", value: "documents" },
] as const;

const RootFixture = (props: Partial<Parameters<typeof ComboboxRootUI>[0]>) => (
  <ComboboxRootUI items={options} {...props}>
    <ComboboxLabelUI>경로</ComboboxLabelUI>
    <ComboboxInputUI aria-label="경로" />
    <ComboboxContentUI>
      <ComboboxListUI />
    </ComboboxContentUI>
  </ComboboxRootUI>
);

describe("ComboboxRootUI", () => {
  it("vendor 세부 정보에서 새 프로젝트 snapshot을 만들고 chip remove invariant를 강제한다", () => {
    const details = { reason: "item-press" } as const;
    const result = toComboboxUIChangeDetails(details);

    expect(result).toEqual({ reason: "item-press" });
    expect(result).not.toBe(details);
    expect(() => toComboboxUIChangeDetails({ reason: "chip-remove-press" })).toThrowError(
      "ComboboxRootUI single-select invariant: chip-remove-press is unreachable",
    );
    expectTypeOf<string>().not.toMatchTypeOf<Parameters<typeof toComboboxUIChangeDetails>[0]>();
    expectTypeOf<"chip-remove-press">().not.toMatchTypeOf<ComboboxUIChangeDetails["reason"]>();
  });

  it("기본값과 입력 식별자를 하위 part에 제공하고 uncontrolled 값을 갱신한다", async () => {
    const user = userEvent.setup();
    renderUITest(<RootFixture defaultOpen defaultValue="desktop" name="route" />);

    const input = screen.getByRole("combobox", { name: "경로" });
    expect(input).toHaveProperty("value", "바탕 화면");
    expect(input.id).toBeTruthy();
    expect(document.querySelector('input[name="route"]')).toBeTruthy();

    await user.click(screen.getByRole("option", { name: "문서" }));
    await waitFor(() => expect(input).toHaveProperty("value", "문서"));
  });

  it("controlled 값은 직접 바꾸지 않고 프로젝트 변경 이유로 callback을 보고한다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(<RootFixture defaultOpen onValueChange={onValueChange} value="desktop" />);

    await user.click(screen.getByRole("option", { name: "문서" }));

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("documents", { reason: "item-press" }),
    );
    expect(screen.getByRole("combobox", { name: "경로" })).toHaveProperty("value", "바탕 화면");
  });

  it("disabled 상태에서는 선택 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(<RootFixture defaultOpen disabled onValueChange={onValueChange} />);

    expect(screen.getAllByRole("combobox", { hidden: true })[0]).toHaveProperty("disabled", true);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
