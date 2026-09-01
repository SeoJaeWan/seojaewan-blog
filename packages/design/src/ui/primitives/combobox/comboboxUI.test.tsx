import { screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import {
  ComboboxUI,
  type ComboboxUIChangeDetails,
  type ComboboxUIOption,
  type ComboboxUIProps,
} from "./index";

afterEach(cleanupUITest);

const options: readonly ComboboxUIOption[] = [{ label: "바탕 화면", value: "desktop" }];

describe("ComboboxUI 조합", () => {
  it("공개 part를 검색 가능한 단일 선택 필드로 조합한다", () => {
    renderUITest(
      <ComboboxUI.Root defaultOpen items={options}>
        <ComboboxUI.Label>경로</ComboboxUI.Label>
        <ComboboxUI.InputGroup>
          <ComboboxUI.Input aria-label="경로" />
          <ComboboxUI.Clear aria-label="경로 지우기" keepMounted />
          <ComboboxUI.Trigger aria-label="경로 보기" />
        </ComboboxUI.InputGroup>
        <ComboboxUI.Content>
          <ComboboxUI.List />
          <ComboboxUI.Empty>결과 없음</ComboboxUI.Empty>
        </ComboboxUI.Content>
      </ComboboxUI.Root>,
    );

    expect(screen.getByRole("combobox", { name: "경로" })).toBeTruthy();
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "바탕 화면" })).toBeTruthy();
  });

  it("공개 option과 Root props가 프로젝트 소유 문자열 계약을 유지한다", () => {
    expectTypeOf<ComboboxUIOption["value"]>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<ComboboxUIProps["onValueChange"]>>().parameters.toEqualTypeOf<
      [string | null, ComboboxUIChangeDetails]
    >();
  });
});
