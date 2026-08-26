import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("keeps native semantics, blocks disabled actions, and supports composition", () => {
    const onPress = vi.fn();
    const disabledPress = vi.fn();

    render(
      <>
        <Button onPress={onPress}>Run</Button>
        <Button disabled onPress={disabledPress}>
          Disabled
        </Button>
        <Button render={<a href="/details" />}>Details</Button>
      </>,
    );

    const runButton = screen.getByRole("button", { name: "Run" });
    const disabledButton = screen.getByRole("button", { name: "Disabled" });

    expect(runButton).toHaveProperty("type", "button");
    expect(runButton.className).toContain("wd-button");
    expect(disabledButton).toHaveProperty("disabled", true);
    fireEvent.click(runButton);
    fireEvent.click(disabledButton);

    expect(onPress).toHaveBeenCalledOnce();
    expect(disabledPress).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("href")).toBe("/details");
  });
});
