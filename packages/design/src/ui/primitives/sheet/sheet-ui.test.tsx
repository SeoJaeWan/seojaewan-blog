import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { SheetUI } from "./sheet-ui";
import type { SheetUIProps } from "./sheet-ui.types";

afterEach(cleanupUITest);

describe("SheetUI", () => {
  it("snapPoints 계약 없이 접근 가능한 bottom sheet를 제공한다", async () => {
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

  it("프로젝트가 소유한 change details만 보고한다", async () => {
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
