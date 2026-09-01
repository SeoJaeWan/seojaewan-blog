import type { PointerEvent } from "react";
import { createContext, useContext } from "react";

import type { WindowResizeUIDirection } from "./windowUI.types";

interface WindowFrameUIInteractionContextValue {
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
  onMovePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown: (
    event: PointerEvent<HTMLElement>,
    direction: WindowResizeUIDirection,
  ) => void;
}

export const WindowFrameUIInteractionContext =
  createContext<WindowFrameUIInteractionContextValue | null>(null);

export const useWindowFrameUIInteraction = () => useContext(WindowFrameUIInteractionContext);
