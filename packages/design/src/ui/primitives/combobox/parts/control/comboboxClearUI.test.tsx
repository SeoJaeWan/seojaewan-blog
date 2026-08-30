import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxClearUI } from "./comboboxClearUI";
import { ComboboxInputUI } from "./comboboxInputUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxClearUI", () => {
  it("기본 button과 기호를 렌더링하고 ref 및 clear callback을 전달한다", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultValue="desktop" items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxClearUI aria-label="경로 지우기" className="custom" keepMounted ref={ref} />
      </ComboboxRootUI>,
    );

    const clear = screen.getByRole("button", { hidden: true, name: "경로 지우기" });
    expect(clear.getAttribute("type")).toBe("button");
    const icon = clear.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(clear.className).toContain("wd-combobox-ui__clear");
    expect(clear.className).toContain("custom");
    expect(ref.current).toBe(clear);

    fireEvent.click(clear);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" }),
    );
  });
});
