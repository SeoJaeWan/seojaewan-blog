import type { PrimitiveCapability } from "../../contracts";

export type BaseUiCapabilityAssessment = Readonly<{
  capability: PrimitiveCapability;
  note: string;
  supported: boolean;
}>;

export const BASE_UI_CAPABILITY_ASSESSMENT: readonly BaseUiCapabilityAssessment[] = [
  {
    capability: "button-composition",
    note: "Native button semantics with Base UI render composition.",
    supported: true,
  },
  {
    capability: "context-menu-global-replacement",
    note: "The neutral adapter coordinates replacement across Base UI roots.",
    supported: true,
  },
  {
    capability: "context-menu-typeahead",
    note: "Provided by Base UI Context Menu item labels.",
    supported: true,
  },
  {
    capability: "drawer-gesture",
    note: "Base UI Drawer provides directional swipe dismissal.",
    supported: true,
  },
  {
    capability: "drawer-snap-points",
    note: "Base UI Drawer provides snap points behind its vendor boundary.",
    supported: true,
  },
  {
    capability: "drawer-virtual-keyboard",
    note: "Base UI Drawer provides a virtual-keyboard positioning provider.",
    supported: true,
  },
];
