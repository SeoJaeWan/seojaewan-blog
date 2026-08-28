import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "./comboboxInputUI";
import { ComboboxTriggerUI } from "./comboboxTriggerUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxTriggerUI", () => {
  it("기본 button과 화살표를 렌더링하고 prop, ref와 열림 callback을 전달한다", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onOpenChange = vi.fn();
    renderUITest(
      <ComboboxRootUI items={options} onOpenChange={onOpenChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxTriggerUI aria-label="경로 보기" className="custom" ref={ref} />
      </ComboboxRootUI>,
    );

    const trigger = screen.getByRole("button", { name: "경로 보기" });
    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.textContent).toBe("▾");
    expect(trigger.className).toContain("wd-combobox-ui__trigger");
    expect(trigger.className).toContain("custom");
    expect(ref.current).toBe(trigger);

    fireEvent.click(trigger);
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" }),
    );
  });
});
