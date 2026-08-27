import { fireEvent, screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { SelectUI, type SelectUIOption } from "./index";
import indexSource from "./index.ts?raw";
import implementationSource from "./selectUI.tsx?raw";
import typesSource from "./selectUI.types.ts?raw";

afterEach(cleanupUITest);

const options: readonly SelectUIOption[] = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
];

const SelectFixture = ({
  defaultValue = "documents",
  disabled = false,
  onValueChange = vi.fn(),
}) => (
  <SelectUI.Root
    defaultOpen
    defaultValue={defaultValue}
    disabled={disabled}
    items={options}
    onValueChange={onValueChange}
  >
    <SelectUI.Label>Tag</SelectUI.Label>
    <SelectUI.Trigger>
      <SelectUI.Value placeholder="Choose a tag" />
    </SelectUI.Trigger>
    <SelectUI.Clear aria-label="Clear tag" />
    <SelectUI.Content>
      <SelectUI.List>
        {options.map((option) => (
          <SelectUI.Item disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </SelectUI.Item>
        ))}
      </SelectUI.List>
    </SelectUI.Content>
  </SelectUI.Root>
);

describe("SelectUI", () => {
  it("input 없는 labelled combobox와 single-select listbox 의미를 제공한다", () => {
    renderUITest(<SelectFixture />);

    const trigger = screen.getByRole("combobox", { name: "Tag" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("listbox").getAttribute("aria-multiselectable")).not.toBe("true");
    expect(screen.getByRole("option", { name: "Documents" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("predefined option만 선택하고 project change contract를 보고한다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(<SelectFixture onValueChange={onValueChange} />);

    await user.click(screen.getByRole("option", { name: "Desktop" }));

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("desktop", { reason: "item-press" }),
    );
  });

  it("disabled option과 disabled root action을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    const { rerender } = renderUITest(<SelectFixture onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("option", { name: "Archive" }));
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(<SelectFixture disabled onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox", { name: "Tag" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear tag" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("uncontrolled selection을 clear하고 null value를 명시적으로 보고한다", () => {
    const onValueChange = vi.fn();
    renderUITest(<SelectFixture onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear tag" }));

    expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" });
    expect(screen.getByRole("combobox", { name: "Tag" }).textContent).toContain("Choose a tag");
    expect(screen.getByRole("button", { name: "Clear tag" }).hasAttribute("disabled")).toBe(true);
  });

  it("vendor type은 공개하지 않고 adapter 구현 내부에만 둔다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
    expect(implementationSource).toContain("@base-ui/react/select");
  });
});
