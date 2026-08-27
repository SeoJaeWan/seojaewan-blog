import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import implementationSource from "./comboboxUI.tsx?raw";
import typesSource from "./comboboxUI.types.ts?raw";
import { ComboboxUI } from "./index";
import indexSource from "./index.ts?raw";

afterEach(cleanupUITest);

const options = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
] as const;

const ComboboxFixture = ({ onValueChange = vi.fn() }) => (
  <ComboboxUI.Root items={options} onValueChange={onValueChange}>
    <ComboboxUI.Label>Route</ComboboxUI.Label>
    <ComboboxUI.InputGroup>
      <ComboboxUI.Input placeholder="Find a route" />
      <ComboboxUI.Clear aria-label="Clear route" keepMounted />
      <ComboboxUI.Trigger aria-label="Show routes" />
    </ComboboxUI.InputGroup>
    <ComboboxUI.Content>
      <ComboboxUI.List />
      <ComboboxUI.Empty>No routes found</ComboboxUI.Empty>
    </ComboboxUI.Content>
  </ComboboxUI.Root>
);

describe("ComboboxUI", () => {
  it("labelled combobox, listbox, option과 disabled 의미를 제공한다", async () => {
    const user = userEvent.setup();
    renderUITest(<ComboboxFixture />);

    const input = screen.getByRole("combobox", { name: "Route" });
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    await user.click(input);
    expect(await screen.findByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Desktop" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Archive" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("predefined labels로 filtering하고 empty 상태를 알린다", async () => {
    const user = userEvent.setup();
    renderUITest(<ComboboxFixture />);
    const input = screen.getByRole("combobox", { name: "Route" });

    await user.type(input, "desk");
    await waitFor(() => expect(screen.getByRole("option", { name: "Desktop" })).toBeTruthy());
    expect(screen.queryByRole("option", { name: "Documents" })).toBeNull();

    await user.clear(input);
    await user.type(input, "missing");
    expect(await screen.findByText("No routes found")).toBeTruthy();
    expect(screen.queryAllByRole("option")).toEqual([]);
  });

  it("predefined option selection과 clear를 프로젝트 change contract로 보고한다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(<ComboboxFixture onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox", { name: "Route" }));
    await user.click(await screen.findByRole("option", { name: "Desktop" }));
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("desktop", { reason: "item-press" }),
    );

    await user.click(screen.getByRole("button", { name: "Clear route", hidden: true }));
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" }),
    );
  });

  it("disabled option action과 arbitrary typed value selection을 실행하지 않는다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(<ComboboxFixture onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Route" });

    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Archive" }));
    await user.type(input, "custom-route");
    await user.keyboard("{Enter}");

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("vendor type은 공개하지 않고 adapter 구현 내부에만 둔다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
    expect(implementationSource).toContain("@base-ui/react/combobox");
  });
});
