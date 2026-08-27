import type { ComponentPropsWithRef } from "react";

/** Project-owned props for the native action button primitive. */
export type ButtonUIProps = Omit<ComponentPropsWithRef<"button">, "role">;
