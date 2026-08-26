import { createRef, useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ContextMenuController,
  ContextMenuOpenChange,
  DrawerOpenChange,
  PresenceState,
} from "../../contracts";
import { Button } from "./button";
import { ContextMenu } from "./context-menu";
import { Drawer } from "./drawer";

import "./styles.css";

afterEach(() => {
  cleanup();
});

describe("Base UI primitive candidate", () => {
  it("keeps native button semantics, blocks disabled actions, and supports composition", () => {
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
    expect(disabledButton).toHaveProperty("disabled", true);
    fireEvent.click(runButton);
    fireEvent.click(disabledButton);

    expect(onPress).toHaveBeenCalledOnce();
    expect(disabledPress).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("href")).toBe("/details");
  });

  it("opens at coordinates, replaces the active menu globally, and restores focus", async () => {
    const firstController = createRef<ContextMenuController>();
    const secondController = createRef<ContextMenuController>();
    const firstChanges: ContextMenuOpenChange[] = [];
    const secondChanges: ContextMenuOpenChange[] = [];

    render(
      <>
        <button type="button">Previous focus</button>
        <ContextMenu
          controllerRef={firstController}
          items={[{ id: "first-action", kind: "action", label: "First action" }]}
          onOpenChange={(change) => firstChanges.push(change)}
          triggerLabel="First surface"
        />
        <ContextMenu
          controllerRef={secondController}
          focusRestoration="previous"
          items={[{ id: "second-action", kind: "action", label: "Second action" }]}
          onOpenChange={(change) => secondChanges.push(change)}
          triggerLabel="Second surface"
        />
      </>,
    );

    const previousFocus = screen.getByRole("button", { name: "Previous focus" });
    previousFocus.focus();
    firstController.current?.openAt({ x: 120, y: 96 });

    expect((await screen.findByRole("menu")).textContent).toContain("First action");
    secondController.current?.openAt({ x: 240, y: 180 });

    await waitFor(() => {
      expect(screen.getAllByRole("menu")).toHaveLength(1);
      expect(screen.getByRole("menu").textContent).toContain("Second action");
    });
    expect(firstChanges).toContainEqual({ open: false, reason: "replaced" });
    expect(secondChanges).toContainEqual({ open: true, reason: "coordinate-request" });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(secondChanges).toContainEqual({ open: false, reason: "escape-key" });
    expect(document.activeElement).toBe(previousFocus);
  });

  it("translates all menu item kinds and never runs a disabled action", async () => {
    const controller = createRef<ContextMenuController>();
    const onAction = vi.fn();
    const onCheckedChange = vi.fn();

    render(
      <ContextMenu
        controllerRef={controller}
        items={[
          { id: "open", kind: "action", label: "Open" },
          {
            checked: false,
            id: "pinned",
            kind: "checkbox",
            label: "Pinned",
            onCheckedChange,
          },
          {
            id: "sort",
            items: [
              { checked: true, groupId: "sort", id: "name", kind: "radio", label: "Name" },
              { checked: false, groupId: "sort", id: "date", kind: "radio", label: "Date" },
            ],
            kind: "submenu",
            label: "Sort",
          },
          { disabled: true, id: "disabled", kind: "action", label: "Unavailable" },
        ]}
        onAction={onAction}
        triggerLabel="Surface"
      />,
    );

    controller.current?.openAt({ x: 20, y: 20 });
    const disabledItem = await screen.findByRole("menuitem", { name: "Unavailable" });
    fireEvent.click(disabledItem);
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Pinned" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onAction).toHaveBeenCalledWith("pinned");
  });

  it("keeps a controlled drawer mounted through exit, traps focus, and restores the trigger", async () => {
    const originalGetAnimations = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "getAnimations",
    );
    let finishExit: (() => void) | undefined;
    const exitFinished = new Promise<void>((resolve) => {
      finishExit = resolve;
    });

    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: () => [{ finished: exitFinished }] as unknown as Animation[],
    });

    const changes: DrawerOpenChange[] = [];
    const presence: PresenceState[] = [];
    const restored = vi.fn();

    const Harness = () => {
      const [open, setOpen] = useState(false);

      return (
        <Drawer
          description="Drawer description"
          focusRestoration="trigger"
          onOpenChange={(change) => {
            changes.push(change);
            setOpen(change.open);
          }}
          onPresenceChange={(state) => presence.push(state)}
          onRestoreFocus={restored}
          open={open}
          placement="right"
          title="Drawer title"
          triggerLabel="Open drawer"
        >
          <button type="button">Drawer action</button>
        </Drawer>
      );
    };

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open drawer" });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Drawer title" });
    await waitFor(() =>
      expect(dialog === document.activeElement || dialog.contains(document.activeElement)).toBe(
        true,
      ),
    );
    expect(changes).toContainEqual({ open: true, reason: "trigger" });

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(document.body.contains(dialog)).toBe(true);
    expect(presence).toContain("exiting");

    finishExit?.();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Drawer title" })).toBeNull());
    expect(changes).toContainEqual({ open: false, reason: "action" });
    expect(presence).toContain("unmounted");
    expect(restored).toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);

    if (originalGetAnimations) {
      Object.defineProperty(Element.prototype, "getAnimations", originalGetAnimations);
    } else {
      Reflect.deleteProperty(Element.prototype, "getAnimations");
    }
  });
});
