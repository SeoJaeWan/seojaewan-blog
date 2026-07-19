import { createContext } from "react";

import type { UseWindowsPins } from "./types";

export const WindowsPinsContext = createContext<UseWindowsPins | null>(null);
