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

describe("Design primitive 공개 API 계약", () => {
  it("모든 primitive를 프로젝트가 소유한 UI 이름으로 package root에서 노출한다", () => {
    expect(Object.keys(design).sort()).toEqual([...PUBLIC_PRIMITIVE_EXPORTS].sort());
    expect(PUBLIC_PRIMITIVE_EXPORTS.every((name) => name.includes("UI"))).toBe(true);
  });

  it("consumer deep import 없이 프로젝트가 소유한 props 계약을 제공한다", () => {
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

  it("SheetUI 공개 계약에서 snapPoints를 제외한다", () => {
    type SheetUIHasSnapPoints = "snapPoints" extends keyof SheetUIProps ? true : false;

    expectTypeOf<SheetUIHasSnapPoints>().toEqualTypeOf<false>();
  });
});
