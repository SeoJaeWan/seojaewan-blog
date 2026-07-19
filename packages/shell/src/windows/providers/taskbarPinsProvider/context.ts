import { createContext } from "react";

import type { UseTaskbarPins } from "./types";

export const TaskbarPinsContext = createContext<UseTaskbarPins | null>(null);
