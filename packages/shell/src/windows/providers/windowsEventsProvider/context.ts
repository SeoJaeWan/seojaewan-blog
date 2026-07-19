import { createContext } from "react";

import type { WindowsEventsContextValue } from "./types";

export const WindowsEventsContext = createContext<WindowsEventsContextValue | null>(null);
