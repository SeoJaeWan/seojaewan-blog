import { createElement, Fragment } from "react";

import type { PrimitiveCandidate } from "../contracts";
import { COMPARISON_ANCHOR, COMPARISON_DRAWER, COMPARISON_MENU_ITEMS } from "./fixture-model";

export type PrimitiveComparisonFixtureProps = Readonly<{
  candidate: PrimitiveCandidate;
}>;

export const PrimitiveComparisonFixture = ({ candidate }: PrimitiveComparisonFixtureProps) =>
  createElement(
    Fragment,
    null,
    createElement(candidate.Button, null, "기본 작업"),
    createElement(candidate.Button, { disabled: true }, "사용할 수 없는 작업"),
    createElement(candidate.ContextMenu, {
      anchor: COMPARISON_ANCHOR,
      focusRestoration: "previous",
      items: COMPARISON_MENU_ITEMS,
      open: true,
      triggerLabel: "창 작업 열기",
    }),
    createElement(
      candidate.Drawer,
      {
        description: COMPARISON_DRAWER.description,
        focusRestoration: "trigger",
        open: true,
        placement: COMPARISON_DRAWER.placement,
        title: COMPARISON_DRAWER.title,
        triggerLabel: COMPARISON_DRAWER.triggerLabel,
      },
      "Drawer fixture content",
    ),
  );
