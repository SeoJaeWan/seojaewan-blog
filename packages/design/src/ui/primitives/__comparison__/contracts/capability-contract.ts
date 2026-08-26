export type PrimitiveCapability =
  | "button-composition"
  | "context-menu-global-replacement"
  | "context-menu-typeahead"
  | "drawer-gesture"
  | "drawer-snap-points"
  | "drawer-virtual-keyboard";

export type CapabilityRequirement = "hard-gate" | "capability-only";

export type CapabilityRow = Readonly<{
  capability: PrimitiveCapability;
  requirement: CapabilityRequirement;
}>;

export const PRIMITIVE_CAPABILITY_ROWS: readonly CapabilityRow[] = [
  { capability: "button-composition", requirement: "hard-gate" },
  { capability: "context-menu-global-replacement", requirement: "hard-gate" },
  { capability: "context-menu-typeahead", requirement: "hard-gate" },
  { capability: "drawer-gesture", requirement: "capability-only" },
  { capability: "drawer-snap-points", requirement: "capability-only" },
  { capability: "drawer-virtual-keyboard", requirement: "capability-only" },
];
