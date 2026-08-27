import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { SheetUI, type SheetUIProps } from "./sheet-ui";

afterEach(cleanupUITest);

describe("SheetUI", () => {
  it("provides an accessible bottom sheet without a snapPoints contract", async () => {
    type HasSnapPoints = "snapPoints" extends keyof SheetUIProps ? true : false;
    expectTypeOf<HasSnapPoints>().toEqualTypeOf<false>();

    renderUITest(
      <SheetUI>
        <SheetUI.Trigger>Open sheet</SheetUI.Trigger>
        <SheetUI.Portal>
          <SheetUI.Backdrop />
          <SheetUI.Viewport data-testid="sheet-viewport">
            <SheetUI.Content>
              <SheetUI.Handle />
              <SheetUI.Title>Bottom actions</SheetUI.Title>
              <SheetUI.Description>Actions anchored to the bottom.</SheetUI.Description>
              <SheetUI.Close>Done</SheetUI.Close>
            </SheetUI.Content>
          </SheetUI.Viewport>
        </SheetUI.Portal>
      </SheetUI>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
    expect(await screen.findByRole("dialog", { name: "Bottom actions" })).not.toBeNull();
    expect(screen.getByTestId("sheet-viewport").className).toContain("wd-sheet-ui__viewport");
  });

  it("reports only project-owned change details", async () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <SheetUI onOpenChange={onOpenChange}>
        <SheetUI.Trigger>Open sheet</SheetUI.Trigger>
        <SheetUI.Portal>
          <SheetUI.Backdrop />
          <SheetUI.Viewport>
            <SheetUI.Content>
              <SheetUI.Title>Sheet</SheetUI.Title>
              <SheetUI.Description>Description</SheetUI.Description>
              <SheetUI.Close>Close</SheetUI.Close>
            </SheetUI.Content>
          </SheetUI.Viewport>
        </SheetUI.Portal>
      </SheetUI>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
    await screen.findByRole("dialog", { name: "Sheet" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
  });
});
