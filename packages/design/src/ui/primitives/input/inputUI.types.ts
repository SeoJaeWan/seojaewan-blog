import type { ComponentPropsWithRef } from "react";

/**
 * Native text-entry props owned by the design package.
 * Validation, submission, and application search state remain consumer responsibilities.
 */
export type InputUIProps = Omit<ComponentPropsWithRef<"input">, "children">;
