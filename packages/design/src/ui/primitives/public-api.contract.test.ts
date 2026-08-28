import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ButtonUIProps,
  CollapsibleUIProps,
  ComboboxUIChangeDetails,
  ComboboxUIProps,
  ContextMenuUIChangeDetails,
  ContextMenuUIProps,
  DialogUIOpenChangeDetails,
  DialogUIProps,
  IconButtonUIProps,
  InputUIProps,
  MenuUIChangeDetails,
  MenuUIProps,
  PopoverUIOpenChangeDetails,
  PopoverUIProps,
  SelectUIChangeDetails,
  SelectUIProps,
} from "../../index";
import * as design from "../../index";

const PUBLIC_PRIMITIVE_EXPORTS = [
  "ButtonUI",
  "CollapsibleUI",
  "ComboboxUI",
  "ContextMenuUI",
  "DialogUI",
  "IconButtonUI",
  "InputUI",
  "MenuUI",
  "PopoverUI",
  "SelectUI",
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

    expectTypeOf<ComboboxUIChangeDetails>().toHaveProperty("reason");
    expectTypeOf<ContextMenuUIChangeDetails>().toHaveProperty("reason");
    expectTypeOf<DialogUIOpenChangeDetails>().toHaveProperty("reason");
    expectTypeOf<MenuUIChangeDetails>().toHaveProperty("reason");
    expectTypeOf<PopoverUIOpenChangeDetails>().toHaveProperty("reason");
    expectTypeOf<SelectUIChangeDetails>().toHaveProperty("reason");
  });
});
