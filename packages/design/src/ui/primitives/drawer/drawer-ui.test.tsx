import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { DrawerUI, type DrawerUIProps } from "./drawer-ui";

afterEach(cleanupUITest);

const ExampleDrawer = ({ onOpenChange }: { onOpenChange?: DrawerUIProps["onOpenChange"] }) => (
  <DrawerUI onOpenChange={onOpenChange} placement="right">
    <DrawerUI.Trigger>Open drawer</DrawerUI.Trigger>
    <DrawerUI.Portal>
      <DrawerUI.Backdrop />
      <DrawerUI.Viewport>
        <DrawerUI.Content>
          <DrawerUI.Title>Quick actions</DrawerUI.Title>
          <DrawerUI.Description>Actions for the selected window.</DrawerUI.Description>
          <DrawerUI.Close>Done</DrawerUI.Close>
        </DrawerUI.Content>
      </DrawerUI.Viewport>
    </DrawerUI.Portal>
  </DrawerUI>
);

describe("DrawerUI", () => {
  it("associates title and description and translates close details", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleDrawer onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));

    const dialog = await screen.findByRole("dialog", { name: "Quick actions" });
    expect(dialog.getAttribute("aria-describedby")).toContain(
      screen.getByText("Actions for the selected window.").id,
    );

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
  });
});
