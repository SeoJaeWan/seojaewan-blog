import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "../control/comboboxInputUI";
import { ComboboxContentUI } from "./comboboxContentUI";
import { ComboboxEmptyUI } from "./comboboxEmptyUI";
import { ComboboxItemUI } from "./comboboxItemUI";
import { ComboboxListUI } from "./comboboxListUI";

afterEach(() => {
  vi.restoreAllMocks();
  cleanupUITest();
});

const options = [
  { label: "바탕 화면", value: "desktop" },
  { disabled: true, label: "보관함", value: "archive" },
] as const;

describe("Combobox options part", () => {
  it("Content는 기본 위치의 popup을 지정 portal에 렌더링하고 prop, className과 ref를 전달한다", () => {
    const portal = document.createElement("section");
    document.body.append(portal);
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI
          className="custom"
          data-testid="content"
          portalContainer={portal}
          ref={ref}
        >
          <ComboboxListUI />
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const content = screen.getByTestId("content");
    expect(portal.contains(content)).toBe(true);
    expect(content.className).toContain("wd-combobox-ui__content");
    expect(content.className).toContain("custom");
    expect(ref.current).toBe(content);
  });

  it("List는 안정적인 값 key로 listbox와 option을 렌더링하고 표시 함수, prop과 ref를 적용한다", async () => {
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
    expect(list.className).toContain("custom");
    expect(ref.current).toBe(list);
    expect(screen.getByRole("option", { name: "항목: 바탕 화면" })).toBeTruthy();
    await waitFor(() =>
      expect(
        consoleError.mock.calls.some((call) => String(call[0]).includes('unique "key" prop')),
      ).toBe(false),
    );
  });

  it("Item은 option의 값, 이름, prop, className, ref와 선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxItemUI className="custom" data-testid="item" ref={ref} value="desktop">
            바탕 화면
          </ComboboxItemUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const item = screen.getByRole("option", { name: "바탕 화면" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.className).toContain("custom");
    expect(ref.current).toBe(item);

    fireEvent.click(item);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("desktop", { reason: "item-press" }),
    );
  });

  it("Item은 disabled option의 비활성 의미를 보존하고 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxItemUI disabled value="archive">
            보관함
          </ComboboxItemUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const item = screen.getByRole("option", { name: "보관함" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("Empty는 결과가 없을 때 메시지, prop, className과 ref를 렌더링한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI defaultOpen defaultInputValue="없음" items={options}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxListUI />
          <ComboboxEmptyUI className="custom" data-testid="empty" ref={ref}>
            결과 없음
          </ComboboxEmptyUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const empty = await screen.findByText("결과 없음");
    expect(empty).toBe(screen.getByTestId("empty"));
    expect(empty.className).toContain("custom");
    expect(ref.current).toBe(empty);
  });
});
