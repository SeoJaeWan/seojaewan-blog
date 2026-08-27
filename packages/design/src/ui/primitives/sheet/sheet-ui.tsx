"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import { createContext, forwardRef, useContext, useId } from "react";

import { Drawer } from "@base-ui/react/drawer";

import "./sheet-ui.css";

export type SheetUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-watcher"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "swipe"
  | "none";

export interface SheetUIOpenChangeDetails {
  reason: SheetUIOpenChangeReason;
}

/**
 * A modal bottom sheet. Snap-point props are intentionally absent while the project uses
 * Base UI 1.7.0; the public contract supports open/closed placement only.
 */
export interface SheetUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: SheetUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface SheetUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface SheetUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type SheetUIBackdropProps = HTMLAttributes<HTMLDivElement>;
export type SheetUIViewportProps = HTMLAttributes<HTMLDivElement>;

export interface SheetUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type SheetUIHandleProps = HTMLAttributes<HTMLDivElement>;
export type SheetUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type SheetUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface SheetUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}

const joinClassNames = (defaultClassName: string, className: string | undefined) =>
  className ? `${defaultClassName} ${className}` : defaultClassName;

const SheetTriggerIdContext = createContext<string | undefined>(undefined);

const SheetUIRoot = ({
  defaultOpen,
  disablePointerDismissal,
  onOpenChange,
  open,
  ...props
}: SheetUIProps) => {
  const triggerId = useId();

  return (
    <SheetTriggerIdContext.Provider value={triggerId}>
      <Drawer.Root
        {...props}
        defaultOpen={defaultOpen}
        defaultTriggerId={defaultOpen ? triggerId : undefined}
        disablePointerDismissal={disablePointerDismissal}
        modal
        onOpenChange={
          onOpenChange
            ? (nextOpen, details) => {
                onOpenChange(nextOpen, { reason: details.reason });
              }
            : undefined
        }
        open={open}
        swipeDirection="down"
        triggerId={open === undefined ? undefined : triggerId}
      />
    </SheetTriggerIdContext.Provider>
  );
};

export const SheetTriggerUI = forwardRef(function SheetTriggerUI(
  { className, id, type = "button", ...props }: SheetUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const triggerId = useContext(SheetTriggerIdContext);

  return (
    <Drawer.Trigger
      {...props}
      className={joinClassNames("wd-sheet-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

export const SheetPortalUI = forwardRef(function SheetPortalUI(
  { className, ...props }: SheetUIPortalProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Portal
      {...props}
      className={joinClassNames("wd-sheet-ui__portal", className)}
      ref={ref}
    />
  );
});

export const SheetBackdropUI = forwardRef(function SheetBackdropUI(
  { className, ...props }: SheetUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Backdrop
      {...props}
      className={joinClassNames("wd-sheet-ui__backdrop", className)}
      ref={ref}
    />
  );
});

export const SheetViewportUI = forwardRef(function SheetViewportUI(
  { className, ...props }: SheetUIViewportProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Viewport
      {...props}
      className={joinClassNames("wd-sheet-ui__viewport", className)}
      ref={ref}
    />
  );
});

export const SheetContentUI = forwardRef(function SheetContentUI(
  { className, finalFocus, initialFocus, ...props }: SheetUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Popup
      {...props}
      className={joinClassNames("wd-sheet-ui__content", className)}
      finalFocus={finalFocus}
      initialFocus={initialFocus}
      ref={ref}
    />
  );
});

export const SheetHandleUI = forwardRef(function SheetHandleUI(
  { className, ...props }: SheetUIHandleProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={joinClassNames("wd-sheet-ui__handle", className)}
      ref={ref}
    />
  );
});

export const SheetTitleUI = forwardRef(function SheetTitleUI(
  { className, ...props }: SheetUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return (
    <Drawer.Title
      {...props}
      className={joinClassNames("wd-sheet-ui__title", className)}
      ref={ref}
    />
  );
});

export const SheetDescriptionUI = forwardRef(function SheetDescriptionUI(
  { className, ...props }: SheetUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Drawer.Description
      {...props}
      className={joinClassNames("wd-sheet-ui__description", className)}
      ref={ref}
    />
  );
});

export const SheetCloseUI = forwardRef(function SheetCloseUI(
  { className, type = "button", ...props }: SheetUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Drawer.Close
      {...props}
      className={joinClassNames("wd-sheet-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});

export const SheetUI = Object.assign(SheetUIRoot, {
  Backdrop: SheetBackdropUI,
  Close: SheetCloseUI,
  Content: SheetContentUI,
  Description: SheetDescriptionUI,
  Handle: SheetHandleUI,
  Portal: SheetPortalUI,
  Title: SheetTitleUI,
  Trigger: SheetTriggerUI,
  Viewport: SheetViewportUI,
});
