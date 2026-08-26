import { createRef, useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./context-menu";
import type { ContextMenuController, ContextMenuOpenChange } from "./types";

afterEach(cleanup);

describe("ContextMenu", () => {
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

  it("emits one close notification for one outside dismissal", async () => {
    const changes: ContextMenuOpenChange[] = [];

    const Harness = () => {
      const [open, setOpen] = useState(true);

      return (
        <ContextMenu
          items={[{ id: "open", kind: "action", label: "Open" }]}
          onOpenChange={(change) => {
            changes.push(change);
            setOpen(change.open);
          }}
          open={open}
          triggerLabel="Surface"
        />
      );
    };

    render(
      <div>
        <Harness />
        <button type="button">Outside</button>
      </div>,
    );

    await screen.findByRole("menu");
    await new Promise((resolve) => setTimeout(resolve, 550));
    fireEvent.mouseDown(screen.getAllByRole("presentation", { hidden: true })[0], { button: 0 });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(
      changes.filter((change) => !change.open && change.reason === "outside-press"),
    ).toHaveLength(1);
  });
});
