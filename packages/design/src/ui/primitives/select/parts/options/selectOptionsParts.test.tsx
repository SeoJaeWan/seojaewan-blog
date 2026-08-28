import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectTriggerUI } from "../control/selectTriggerUI";
import { SelectRootUI } from "../selectRootUI";
import { SelectContentUI } from "./selectContentUI";
import { SelectItemUI } from "./selectItemUI";
import { SelectListUI } from "./selectListUI";

afterEach(cleanupUITest);

const options = [
  { label: "문서", value: "documents" },
  { disabled: true, label: "보관함", value: "archive" },
] as const;

describe("Select options part", () => {
  it("Content는 기본 위치의 popup을 지정 portal에 렌더링하고 prop, className과 ref를 전달한다", () => {
    const portal = document.createElement("section");
    document.body.append(portal);
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI defaultOpen items={options}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI
          className="custom"
          data-testid="content"
          portalContainer={portal}
          ref={ref}
        >
          <SelectListUI>
            <SelectItemUI value="documents">문서</SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const content = screen.getByTestId("content");
    expect(portal.contains(content)).toBe(true);
    expect(content.className).toContain("wd-select-ui__content");
    expect(content.className).toContain("custom");
    expect(ref.current).toBe(content);
  });

  it("List는 단일 선택 listbox role, prop, className과 ref를 실제 목록에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI defaultOpen items={options}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI className="custom" data-testid="list" ref={ref}>
            <SelectItemUI value="documents">문서</SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const list = screen.getByRole("listbox");
    expect(list).toBe(screen.getByTestId("list"));
    expect(list.getAttribute("aria-multiselectable")).not.toBe("true");
    expect(list.className).toContain("custom");
    expect(ref.current).toBe(list);
  });

  it("Item은 option의 값, 이름, prop, className, ref와 선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLElement>();
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(
      <SelectRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI>
            <SelectItemUI className="custom" data-testid="item" ref={ref} value="documents">
              문서
            </SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const item = screen.getByRole("option", { name: "문서" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.className).toContain("custom");
    expect(ref.current).toBe(item);

    await user.click(item);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("documents", { reason: "item-press" }),
    );
  });

  it("Item은 disabled option의 비활성 의미를 보존하고 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(
      <SelectRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI>
            <SelectItemUI disabled value="archive">
              보관함
            </SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const item = screen.getByRole("option", { name: "보관함" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
