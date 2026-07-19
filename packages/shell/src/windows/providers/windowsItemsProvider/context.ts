import { createContext } from "react";

import type { WindowItem } from "@window/ui";

export const WindowsItemsContext = createContext<readonly WindowItem[] | null>(null);
