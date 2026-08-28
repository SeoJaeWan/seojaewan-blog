import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "./comboboxInputUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxInputUI", () => {
  it("combobox role, 명시 prop, className, ref와 검색 callback을 제공한다", async () => {
    const ref = createRef<HTMLInputElement>();
    const onInputValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI items={options} onInputValueChange={onInputValueChange}>
        <ComboboxInputUI
          aria-label="경로"
          className="custom"
          data-testid="input"
          id="route-input"
          ref={ref}
        />
      </ComboboxRootUI>,
    );

    const input = screen.getByRole("combobox", { name: "경로" });
    expect(input.id).toBe("route-input");
    expect(input.className).toContain("wd-combobox-ui__input");
    expect(input.className).toContain("custom");
    expect(ref.current).toBe(input);

    fireEvent.change(input, { target: { value: "바" } });
    await waitFor(() =>
      expect(onInputValueChange).toHaveBeenCalledWith("바", { reason: "input-change" }),
    );
  });
});
