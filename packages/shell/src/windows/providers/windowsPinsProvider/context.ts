import { createContext } from "react";

import type { WindowsPinsContextValue } from "./types";

export const WindowsPinsContext = createContext<WindowsPinsContextValue | null>(null);
