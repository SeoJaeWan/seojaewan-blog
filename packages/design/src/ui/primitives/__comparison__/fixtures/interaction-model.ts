export type InteractionTarget =
  | "button.primary"
  | "button.disabled"
  | "context-menu.surface-a"
  | "context-menu.surface-b"
  | "context-menu.item.open"
  | "context-menu.item.unavailable"
  | "drawer.trigger";

export type InteractionStep = Readonly<
  | {
      action: "press";
      target: InteractionTarget;
    }
  | {
      action: "open-at";
      target: "context-menu.surface-a" | "context-menu.surface-b";
      x: number;
      y: number;
    }
  | {
      action: "key";
      key: "ArrowDown" | "ArrowUp" | "ArrowLeft" | "ArrowRight" | "Home" | "End" | "Escape";
    }
  | {
      action: "outside-press";
    }
  | {
      action: "set-controlled-open";
      open: boolean;
      target: "context-menu.surface-a" | "drawer.trigger";
    }
>;

export type ComparisonCheckpoint = Readonly<{
  expectation:
    | "action-ran"
    | "disabled-action-did-not-run"
    | "only-latest-menu-present"
    | "focus-restored"
    | "exit-present"
    | "exit-complete";
  afterStep: number;
}>;

export type ComparisonScenario = Readonly<{
  checkpoints: readonly ComparisonCheckpoint[];
  id: string;
  steps: readonly InteractionStep[];
}>;

export const PRIMITIVE_COMPARISON_SCENARIOS: readonly ComparisonScenario[] = [
  {
    checkpoints: [
      { afterStep: 1, expectation: "action-ran" },
      { afterStep: 2, expectation: "disabled-action-did-not-run" },
    ],
    id: "button-activation",
    steps: [
      { action: "press", target: "button.primary" },
      { action: "press", target: "button.disabled" },
    ],
  },
  {
    checkpoints: [
      { afterStep: 2, expectation: "only-latest-menu-present" },
      { afterStep: 3, expectation: "focus-restored" },
    ],
    id: "context-menu-replacement",
    steps: [
      { action: "open-at", target: "context-menu.surface-a", x: 120, y: 96 },
      { action: "open-at", target: "context-menu.surface-b", x: 240, y: 180 },
      { action: "key", key: "Escape" },
    ],
  },
  {
    checkpoints: [
      { afterStep: 2, expectation: "exit-present" },
      { afterStep: 2, expectation: "exit-complete" },
      { afterStep: 2, expectation: "focus-restored" },
    ],
    id: "drawer-controlled-exit",
    steps: [
      { action: "press", target: "drawer.trigger" },
      { action: "set-controlled-open", open: false, target: "drawer.trigger" },
    ],
  },
];
