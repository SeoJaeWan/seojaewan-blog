import type { ComponentPropsWithRef } from "react";

/**
 * Project-owned native button props for ButtonUI.
 * They describe button mechanics, not the business action triggered by the button.
 */
export type ButtonUIProps = Omit<ComponentPropsWithRef<"button">, "role">;
