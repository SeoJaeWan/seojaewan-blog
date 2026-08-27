import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ButtonUIProps,
  ContextMenuUIProps,
  DialogUIProps,
  DrawerUIProps,
  IconButtonUIProps,
  MenuUIProps,
  PopoverUIProps,
  SheetUIProps,
  TooltipUIProps,
} from "../../index";
import * as design from "../../index";

const PUBLIC_PRIMITIVE_EXPORTS = [
  "ButtonUI",
  "ContextMenuCheckboxItemUI",
  "ContextMenuContentUI",
  "ContextMenuItemUI",
  "ContextMenuRadioGroupUI",
  "ContextMenuRadioItemUI",
  "ContextMenuRootUI",
  "ContextMenuSeparatorUI",
  "ContextMenuSubmenuContentUI",
  "ContextMenuSubmenuRootUI",
  "ContextMenuSubmenuTriggerUI",
  "ContextMenuSubmenuUI",
  "ContextMenuTriggerUI",
  "ContextMenuUI",
  "DialogBackdropUI",
  "DialogCloseUI",
  "DialogContentUI",
  "DialogDescriptionUI",
  "DialogPortalUI",
  "DialogTitleUI",
  "DialogTriggerUI",
  "DialogUI",
  "DrawerBackdropUI",
  "DrawerCloseUI",
  "DrawerContentUI",
  "DrawerDescriptionUI",
  "DrawerPortalUI",
  "DrawerTitleUI",
  "DrawerTriggerUI",
  "DrawerUI",
  "DrawerViewportUI",
  "IconButtonUI",
  "MenuCheckboxItemUI",
  "MenuContentUI",
  "MenuItemUI",
  "MenuRadioGroupUI",
  "MenuRadioItemUI",
  "MenuRootUI",
  "MenuSeparatorUI",
  "MenuSubmenuContentUI",
  "MenuSubmenuRootUI",
  "MenuSubmenuTriggerUI",
  "MenuSubmenuUI",
  "MenuTriggerUI",
  "MenuUI",
  "PopoverCloseUI",
  "PopoverContentUI",
  "PopoverDescriptionUI",
  "PopoverTitleUI",
  "PopoverTriggerUI",
  "PopoverUI",
  "SheetBackdropUI",
  "SheetCloseUI",
  "SheetContentUI",
  "SheetDescriptionUI",
  "SheetHandleUI",
  "SheetPortalUI",
  "SheetTitleUI",
  "SheetTriggerUI",
  "SheetUI",
  "SheetViewportUI",
  "TooltipContentUI",
  "TooltipGroupUI",
  "TooltipTriggerUI",
  "TooltipUI",
] as const;

describe("Design primitive public API", () => {
  it("exposes every primitive through the package root with project-owned UI names", () => {
    expect(Object.keys(design).sort()).toEqual([...PUBLIC_PRIMITIVE_EXPORTS].sort());
    expect(PUBLIC_PRIMITIVE_EXPORTS.every((name) => name.includes("UI"))).toBe(true);
  });

  it("provides project-owned prop contracts without consumer deep imports", () => {
    expectTypeOf<ButtonUIProps>().toBeObject();
    expectTypeOf<IconButtonUIProps>().toBeObject();
    expectTypeOf<MenuUIProps>().toBeObject();
    expectTypeOf<ContextMenuUIProps>().toBeObject();
    expectTypeOf<PopoverUIProps>().toBeObject();
    expectTypeOf<TooltipUIProps>().toBeObject();
    expectTypeOf<DialogUIProps>().toBeObject();
    expectTypeOf<DrawerUIProps>().toBeObject();
    expectTypeOf<SheetUIProps>().toBeObject();
  });

  it("keeps snapPoints outside the SheetUI public contract", () => {
    type SheetUIHasSnapPoints = "snapPoints" extends keyof SheetUIProps ? true : false;

    expectTypeOf<SheetUIHasSnapPoints>().toEqualTypeOf<false>();
  });
});
