import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxClearUI } from "./comboboxClearUI";
import { ComboboxInputGroupUI } from "./comboboxInputGroupUI";
import { ComboboxInputUI } from "./comboboxInputUI";
import { ComboboxLabelUI } from "./comboboxLabelUI";
import { ComboboxTriggerUI } from "./comboboxTriggerUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("Combobox control part", () => {
  it("Label은 입력과 이름을 연결하고 label prop, className과 ref를 전달한다", () => {
    const ref = createRef<HTMLLabelElement>();
    renderUITest(
      <ComboboxRootUI items={options}>
        <ComboboxLabelUI className="custom" data-testid="label" ref={ref}>
          경로
        </ComboboxLabelUI>
        <ComboboxInputUI />
      </ComboboxRootUI>,
    );

    const label = screen.getByTestId("label");
    expect(label.tagName).toBe("LABEL");
    expect(label.className).toContain("wd-combobox-ui__label");
    expect(label.className).toContain("custom");
    expect(label.getAttribute("for")).toBe(screen.getByRole("combobox", { name: "경로" }).id);
    expect(ref.current).toBe(label);
  });

  it("InputGroup은 div prop, className과 ref를 실제 그룹 요소에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI items={options}>
        <ComboboxInputGroupUI className="custom" data-testid="group" ref={ref}>
          <ComboboxInputUI aria-label="경로" />
        </ComboboxInputGroupUI>
      </ComboboxRootUI>,
    );

    const group = screen.getByTestId("group");
    expect(group.tagName).toBe("DIV");
    expect(group.className).toContain("wd-combobox-ui__input-group");
    expect(group.className).toContain("custom");
    expect(ref.current).toBe(group);
  });

  it("Input은 combobox role, 명시 prop, className, ref와 검색 callback을 제공한다", async () => {
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

  it("Trigger는 기본 button과 화살표를 렌더링하고 prop, ref와 열림 callback을 전달한다", async () => {
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
    expect(trigger.className).toContain("custom");
    expect(ref.current).toBe(trigger);

    fireEvent.click(trigger);
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" }),
    );
  });

  it("Clear는 기본 button과 기호를 렌더링하고 ref 및 clear callback을 전달한다", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultValue="desktop" items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxClearUI aria-label="경로 지우기" keepMounted ref={ref} />
      </ComboboxRootUI>,
    );

    const clear = screen.getByRole("button", { hidden: true, name: "경로 지우기" });
    expect(clear.getAttribute("type")).toBe("button");
    expect(clear.textContent).toBe("×");
    expect(ref.current).toBe(clear);

    fireEvent.click(clear);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" }),
    );
  });
});
