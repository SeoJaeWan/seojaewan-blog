import type { ReactElement, ReactNode, Ref } from "react";

export type ButtonProps = Readonly<{
  children?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
}>;
