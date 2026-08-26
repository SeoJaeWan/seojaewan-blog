import { createRef } from "react";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuController } from "../../contracts";
import { Button } from "./button";
import { candidate } from "./candidate";
import { RADIX_CAPABILITY_ASSESSMENT } from "./capabilities";
import { ContextMenu } from "./context-menu";
import { Drawer } from "./drawer";

afterEach(() => cleanup());

describe("Radix primitive candidate", () => {
  it("registers the complete neutral candidate and explicit sheet gaps", () => {
    expect(candidate).toMatchObject({
      Button,
      ContextMenu,
      Drawer,
      name: "radix",
    });
    expect(
      RADIX_CAPABILITY_ASSESSMENT.filter(({ supported }) => !supported).map(
        ({ capability }) => capability,
      ),
    ).toEqual(["drawer-gesture", "drawer-snap-points", "drawer-virtual-keyboard"]);
  });

  it("uses native disabled behavior and composes a supplied button through Slot", () => {
    const enabledPress = vi.fn();
    const disabledPress = vi.fn();
    const composedPress = vi.fn();

    render(
      <>
        <Button onPress={enabledPress}>Enabled</Button>
        <Button disabled onPress={disabledPress}>
          Disabled
        </Button>
        <Button
          onPress={composedPress}
          render={
            <a data-probe="composed" href="/details" onClick={(event) => event.preventDefault()} />
          }
        >
          Composed
        </Button>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Disabled" }));
    const composedButton = screen.getByRole("button", { name: "Composed" });
    fireEvent.click(composedButton);
    fireEvent.keyDown(composedButton, { key: "Enter" });

    expect(enabledPress).toHaveBeenCalledOnce();
    expect(disabledPress).not.toHaveBeenCalled();
    expect(composedPress).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-probe="composed"]')).not.toBeNull();
  });

  it("exposes coordinate opening and programmatic closing through the neutral controller", () => {
    const controller = createRef<ContextMenuController>();
    const onOpenChange = vi.fn();

    render(
      <ContextMenu
        controllerRef={controller}
        items={[{ id: "open", kind: "action", label: "Open" }]}
        onOpenChange={onOpenChange}
        triggerLabel="Menu"
      />,
    );

    act(() => controller.current?.openAt({ x: 120, y: 96 }));
    expect(screen.getByRole("menu")).not.toBeNull();
    act(() => controller.current?.close("programmatic"));
    expect(screen.queryByRole("menu")).toBeNull();

    expect(onOpenChange).toHaveBeenCalledWith({
      open: true,
      reason: "coordinate-request",
    });
    expect(onOpenChange).toHaveBeenCalledWith({
      open: false,
      reason: "programmatic",
    });
  });

  it("replaces the active context menu across independent Radix roots", () => {
    const firstController = createRef<ContextMenuController>();
    const secondController = createRef<ContextMenuController>();
    const firstOpenChange = vi.fn();

    render(
      <>
        <ContextMenu
          controllerRef={firstController}
          items={[{ id: "first", kind: "action", label: "First action" }]}
          onOpenChange={firstOpenChange}
          triggerLabel="First menu"
        />
        <ContextMenu
          controllerRef={secondController}
          items={[{ id: "second", kind: "action", label: "Second action" }]}
          triggerLabel="Second menu"
        />
      </>,
    );

    act(() => firstController.current?.openAt({ x: 10, y: 10 }));
    act(() => secondController.current?.openAt({ x: 20, y: 20 }));

    expect(firstOpenChange).toHaveBeenCalledWith({ open: false, reason: "replaced" });
    expect(screen.queryByText("First action")).toBeNull();
    expect(screen.getByText("Second action")).not.toBeNull();
  });

  it("renders Dialog content in a portal and reports action dismissal", () => {
    const onOpenChange = vi.fn();

    render(
      <Drawer
        defaultOpen
        description="Sheet description"
        onOpenChange={onOpenChange}
        placement="right"
        title="Sheet title"
        triggerLabel="Open sheet"
      >
        Sheet body
      </Drawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Sheet title" });
    expect(dialog.parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: "action" });
  });

  it("leaves controlled sheet teardown to its external owner", () => {
    const onOpenChange = vi.fn();
    const commonProps = {
      description: "Controlled description",
      onOpenChange,
      placement: "bottom" as const,
      title: "Controlled sheet",
      triggerLabel: "Open controlled sheet",
    };
    const { rerender } = render(<Drawer {...commonProps} open />);

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onOpenChange).toHaveBeenCalledWith({ open: false, reason: "action" });
    expect(screen.getByRole("dialog", { name: "Controlled sheet" })).not.toBeNull();

    rerender(<Drawer {...commonProps} open={false} />);
    expect(screen.queryByRole("dialog", { name: "Controlled sheet" })).toBeNull();
  });
});
