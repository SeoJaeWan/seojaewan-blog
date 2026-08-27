import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ButtonUIProps,
  CollapsibleUIProps,
  ComboboxUIProps,
  ContextMenuUIProps,
  DialogUIProps,
  IconButtonUIProps,
  InputUIProps,
  MenuUIProps,
  PopoverUIProps,
  SelectUIProps,
} from "../../index";
import * as design from "../../index";

const PUBLIC_PRIMITIVE_EXPORTS = [
  "ButtonUI",
  "CollapsiblePanelUI",
  "CollapsibleRootUI",
  "CollapsibleTriggerUI",
  "CollapsibleUI",
  "ComboboxClearUI",
  "ComboboxContentUI",
  "ComboboxEmptyUI",
  "ComboboxInputGroupUI",
  "ComboboxInputUI",
  "ComboboxItemUI",
  "ComboboxLabelUI",
  "ComboboxListUI",
  "ComboboxRootUI",
  "ComboboxTriggerUI",
  "ComboboxUI",
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
  "IconButtonUI",
  "InputUI",
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
  "SelectClearUI",
  "SelectContentUI",
  "SelectItemUI",
  "SelectLabelUI",
  "SelectListUI",
  "SelectRootUI",
  "SelectTriggerUI",
  "SelectUI",
  "SelectValueUI",
] as const;

describe("Design primitive 공개 API 계약", () => {
  it("모든 primitive를 프로젝트가 소유한 UI 이름으로 package root에서 노출한다", () => {
    expect(Object.keys(design).sort()).toEqual([...PUBLIC_PRIMITIVE_EXPORTS].sort());
    expect(PUBLIC_PRIMITIVE_EXPORTS.every((name) => name.includes("UI"))).toBe(true);
  });

  it("consumer deep import 없이 프로젝트가 소유한 props 계약을 제공한다", () => {
    expectTypeOf<ButtonUIProps>().toBeObject();
    expectTypeOf<CollapsibleUIProps>().toBeObject();
    expectTypeOf<ComboboxUIProps>().toBeObject();
    expectTypeOf<IconButtonUIProps>().toBeObject();
    expectTypeOf<InputUIProps>().toBeObject();
    expectTypeOf<MenuUIProps>().toBeObject();
    expectTypeOf<ContextMenuUIProps>().toBeObject();
    expectTypeOf<PopoverUIProps>().toBeObject();
    expectTypeOf<DialogUIProps>().toBeObject();
    expectTypeOf<SelectUIProps>().toBeObject();
  });
});
