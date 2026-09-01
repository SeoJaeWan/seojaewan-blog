import type { Ref } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import {
  SelectUI,
  type SelectUIChangeDetails,
  type SelectUIControlProps,
  type SelectUIOption,
  type SelectUIProps,
} from "./index";

afterEach(cleanupUITest);

const options: readonly SelectUIOption[] = [{ label: "문서", value: "documents" }];

describe("SelectUI 조합", () => {
  it("공개 part를 입력 없는 단일 선택 필드로 조합한다", () => {
    renderUITest(
      <SelectUI.Root defaultOpen defaultValue="documents" items={options}>
        <SelectUI.Label>태그</SelectUI.Label>
        <SelectUI.Control data-testid="control">
          <SelectUI.Trigger>
            <SelectUI.Value />
          </SelectUI.Trigger>
          <SelectUI.Clear aria-label="태그 지우기" />
        </SelectUI.Control>
        <SelectUI.Content>
          <SelectUI.List>
            <SelectUI.Item value="documents">문서</SelectUI.Item>
          </SelectUI.List>
        </SelectUI.Content>
      </SelectUI.Root>,
    );

    const control = screen.getByTestId("control");
    const trigger = screen.getByRole("combobox", { name: "태그" });
    const clear = screen.getByRole("button", { name: "태그 지우기" });
    expect(control.tagName).toBe("DIV");
    expect(trigger.parentElement).toBe(control);
    expect(clear.parentElement).toBe(control);
    expect(trigger).not.toBe(clear);
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "문서" })).toBeTruthy();
  });

  it("공개 option과 Root props가 프로젝트 소유 문자열 계약을 유지한다", () => {
    expectTypeOf<SelectUIControlProps["ref"]>().toMatchTypeOf<Ref<HTMLDivElement> | undefined>();
    expectTypeOf<SelectUIOption["value"]>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<SelectUIProps["onValueChange"]>>().parameters.toEqualTypeOf<
      [string | null, SelectUIChangeDetails]
    >();
  });
});
