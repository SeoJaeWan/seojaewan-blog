import type { PrimitiveCapability } from "../../contracts";

export type RadixCapabilityAssessment = Readonly<{
  capability: PrimitiveCapability;
  note: string;
  supported: boolean;
}>;

export const RADIX_CAPABILITY_ASSESSMENT: readonly RadixCapabilityAssessment[] = [
  {
    capability: "button-composition",
    note: "Native button semantics with Radix Slot composition.",
    supported: true,
  },
  {
    capability: "context-menu-global-replacement",
    note: "The neutral adapter coordinates replacement across Radix roots.",
    supported: true,
  },
  {
    capability: "context-menu-typeahead",
    note: "Provided by Radix Context Menu item text values.",
    supported: true,
  },
  {
    capability: "drawer-gesture",
    note: "Gap: Radix Dialog has no native drag-to-dismiss gesture.",
    supported: false,
  },
  {
    capability: "drawer-snap-points",
    note: "Gap: Radix Dialog has no native sheet snap-point model.",
    supported: false,
  },
  {
    capability: "drawer-virtual-keyboard",
    note: "Gap: Dialog-as-Sheet exposes no first-party virtual-keyboard repositioning policy.",
    supported: false,
  },
];
