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

import "./drawer-ui.css";

export type DrawerUIPlacement = "left" | "right";

export type DrawerUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-watcher"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "swipe"
  | "none";

export interface DrawerUIOpenChangeDetails {
  reason: DrawerUIOpenChangeReason;
}

export interface DrawerUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: DrawerUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  placement?: DrawerUIPlacement;
}

export interface DrawerUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface DrawerUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type DrawerUIBackdropProps = HTMLAttributes<HTMLDivElement>;
export type DrawerUIViewportProps = HTMLAttributes<HTMLDivElement>;

export interface DrawerUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type DrawerUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type DrawerUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface DrawerUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}

const joinClassNames = (defaultClassName: string, className: string | undefined) =>
  className ? `${defaultClassName} ${className}` : defaultClassName;

interface DrawerUIContextValue {
  placement: DrawerUIPlacement;
  triggerId: string;
}

const DrawerUIContext = createContext<DrawerUIContextValue | undefined>(undefined);

const useDrawerUIContext = () => {
  const context = useContext(DrawerUIContext);

  if (!context) {
    throw new Error("DrawerUI parts must be rendered inside DrawerUI.");
  }

  return context;
};

const DrawerUIRoot = ({
  defaultOpen,
  disablePointerDismissal,
  onOpenChange,
  open,
  placement = "right",
  ...props
}: DrawerUIProps) => {
  const triggerId = useId();

  return (
    <DrawerUIContext.Provider value={{ placement, triggerId }}>
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
        swipeDirection={placement}
        triggerId={open === undefined ? undefined : triggerId}
      />
    </DrawerUIContext.Provider>
  );
};

export const DrawerTriggerUI = forwardRef(function DrawerTriggerUI(
  { className, id, type = "button", ...props }: DrawerUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const { triggerId } = useDrawerUIContext();

  return (
    <Drawer.Trigger
      {...props}
      className={joinClassNames("wd-drawer-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

export const DrawerPortalUI = forwardRef(function DrawerPortalUI(
  { className, ...props }: DrawerUIPortalProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Portal
      {...props}
      className={joinClassNames("wd-drawer-ui__portal", className)}
      ref={ref}
    />
  );
});

export const DrawerBackdropUI = forwardRef(function DrawerBackdropUI(
  { className, ...props }: DrawerUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Backdrop
      {...props}
      className={joinClassNames("wd-drawer-ui__backdrop", className)}
      ref={ref}
    />
  );
});

export const DrawerViewportUI = forwardRef(function DrawerViewportUI(
  { className, ...props }: DrawerUIViewportProps,
  ref: Ref<HTMLDivElement>,
) {
  const { placement } = useDrawerUIContext();

  return (
    <Drawer.Viewport
      {...props}
      className={joinClassNames(
        `wd-drawer-ui__viewport wd-drawer-ui__viewport--${placement}`,
        className,
      )}
      ref={ref}
    />
  );
});

export const DrawerContentUI = forwardRef(function DrawerContentUI(
  { className, finalFocus, initialFocus, ...props }: DrawerUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  const { placement } = useDrawerUIContext();

  return (
    <Drawer.Popup
      {...props}
      className={joinClassNames(
        `wd-drawer-ui__content wd-drawer-ui__content--${placement}`,
        className,
      )}
      finalFocus={finalFocus}
      initialFocus={initialFocus}
      ref={ref}
    />
  );
});

export const DrawerTitleUI = forwardRef(function DrawerTitleUI(
  { className, ...props }: DrawerUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return (
    <Drawer.Title
      {...props}
      className={joinClassNames("wd-drawer-ui__title", className)}
      ref={ref}
    />
  );
});

export const DrawerDescriptionUI = forwardRef(function DrawerDescriptionUI(
  { className, ...props }: DrawerUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Drawer.Description
      {...props}
      className={joinClassNames("wd-drawer-ui__description", className)}
      ref={ref}
    />
  );
});

export const DrawerCloseUI = forwardRef(function DrawerCloseUI(
  { className, type = "button", ...props }: DrawerUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Drawer.Close
      {...props}
      className={joinClassNames("wd-drawer-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});

export const DrawerUI = Object.assign(DrawerUIRoot, {
  Backdrop: DrawerBackdropUI,
  Close: DrawerCloseUI,
  Content: DrawerContentUI,
  Description: DrawerDescriptionUI,
  Portal: DrawerPortalUI,
  Title: DrawerTitleUI,
  Trigger: DrawerTriggerUI,
  Viewport: DrawerViewportUI,
});
