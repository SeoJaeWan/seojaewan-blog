import type { PrimitiveCandidate } from "../../contracts";
import { Button } from "./button";
import { ContextMenu } from "./context-menu";
import { Drawer } from "./drawer";

export const candidate = {
  Button,
  ContextMenu,
  Drawer,
  name: "base-ui",
} satisfies PrimitiveCandidate;
