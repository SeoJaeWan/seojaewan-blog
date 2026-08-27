import { Button as BaseButton } from "@base-ui/react/button";

import type { ButtonUIProps } from "./button-ui.types";

/** Keeps the third-party primitive behind the project-owned button contract. */
export const ButtonUIAdapter = (props: ButtonUIProps) => <BaseButton {...props} />;
