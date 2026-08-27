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

import { Dialog } from "@base-ui/react/dialog";

import "./dialog-ui.css";

export type DialogUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

export interface DialogUIOpenChangeDetails {
  reason: DialogUIOpenChangeReason;
}

export interface DialogUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: DialogUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface DialogUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface DialogUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type DialogUIBackdropProps = HTMLAttributes<HTMLDivElement>;

export interface DialogUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type DialogUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type DialogUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface DialogUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}

const joinClassNames = (defaultClassName: string, className: string | undefined) =>
  className ? `${defaultClassName} ${className}` : defaultClassName;

const DialogTriggerIdContext = createContext<string | undefined>(undefined);

const DialogUIRoot = ({
  defaultOpen,
  disablePointerDismissal,
  onOpenChange,
  open,
  ...props
}: DialogUIProps) => {
  const triggerId = useId();

  return (
    <DialogTriggerIdContext.Provider value={triggerId}>
      <Dialog.Root
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
        triggerId={open === undefined ? undefined : triggerId}
      />
    </DialogTriggerIdContext.Provider>
  );
};

export const DialogTriggerUI = forwardRef(function DialogTriggerUI(
  { className, id, type = "button", ...props }: DialogUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const triggerId = useContext(DialogTriggerIdContext);

  return (
    <Dialog.Trigger
      {...props}
      className={joinClassNames("wd-dialog-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

export const DialogPortalUI = forwardRef(function DialogPortalUI(
  { className, ...props }: DialogUIPortalProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Portal
      {...props}
      className={joinClassNames("wd-dialog-ui__portal", className)}
      ref={ref}
    />
  );
});

export const DialogBackdropUI = forwardRef(function DialogBackdropUI(
  { className, ...props }: DialogUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Backdrop
      {...props}
      className={joinClassNames("wd-dialog-ui__backdrop", className)}
      ref={ref}
    />
  );
});

export const DialogContentUI = forwardRef(function DialogContentUI(
  { className, finalFocus, initialFocus, ...props }: DialogUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Viewport className="wd-dialog-ui__viewport">
      <Dialog.Popup
        {...props}
        className={joinClassNames("wd-dialog-ui__content", className)}
        finalFocus={finalFocus}
        initialFocus={initialFocus}
        ref={ref}
      />
    </Dialog.Viewport>
  );
});

export const DialogTitleUI = forwardRef(function DialogTitleUI(
  { className, ...props }: DialogUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return (
    <Dialog.Title
      {...props}
      className={joinClassNames("wd-dialog-ui__title", className)}
      ref={ref}
    />
  );
});

export const DialogDescriptionUI = forwardRef(function DialogDescriptionUI(
  { className, ...props }: DialogUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Dialog.Description
      {...props}
      className={joinClassNames("wd-dialog-ui__description", className)}
      ref={ref}
    />
  );
});

export const DialogCloseUI = forwardRef(function DialogCloseUI(
  { className, type = "button", ...props }: DialogUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Dialog.Close
      {...props}
      className={joinClassNames("wd-dialog-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});

export const DialogUI = Object.assign(DialogUIRoot, {
  Backdrop: DialogBackdropUI,
  Close: DialogCloseUI,
  Content: DialogContentUI,
  Description: DialogDescriptionUI,
  Portal: DialogPortalUI,
  Title: DialogTitleUI,
  Trigger: DialogTriggerUI,
});
