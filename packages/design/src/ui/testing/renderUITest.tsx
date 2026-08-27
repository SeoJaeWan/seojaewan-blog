import type { ReactNode } from "react";

import { cleanup, render, type RenderOptions, type RenderResult } from "@testing-library/react";

export const renderUITest = (ui: ReactNode, options?: RenderOptions): RenderResult =>
  render(ui, options);

export const cleanupUITest = () => cleanup();
