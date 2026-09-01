import { createRef } from "react";

import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "../control/comboboxInputUI";
import { ComboboxContentUI } from "./comboboxContentUI";
import { ComboboxListUI } from "./comboboxListUI";

afterEach(() => {
  vi.restoreAllMocks();
  cleanupUITest();
});

const options = [
  { label: "바탕 화면", value: "desktop" },
  { disabled: true, label: "보관함", value: "archive" },
] as const;

describe("ComboboxListUI", () => {
  it("선택 목록을 안정적으로 표시한다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxListUI
            className="custom"
            data-testid="list"
            ref={ref}
            renderItem={(option) => `항목: ${option.label}`}
          />
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const list = screen.getByRole("listbox");
    expect(list).toBe(screen.getByTestId("list"));
    expect(list.className).toContain("wd-combobox-ui__list");
    expect(list.className).toContain("custom");
    expect(ref.current).toBe(list);
    expect(screen.getByRole("option", { name: "항목: 바탕 화면" })).toBeTruthy();
    await waitFor(() =>
      expect(
        consoleError.mock.calls.some((call) => String(call[0]).includes('unique "key" prop')),
      ).toBe(false),
    );
  });
});
