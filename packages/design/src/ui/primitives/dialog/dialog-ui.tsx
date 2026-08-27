"use client";

import type { Ref } from "react";
import { createContext, forwardRef, useContext, useId } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type {
  DialogUIBackdropProps,
  DialogUICloseProps,
  DialogUIContentProps,
  DialogUIDescriptionProps,
  DialogUIPortalProps,
  DialogUIProps,
  DialogUITitleProps,
  DialogUITriggerProps,
} from "./dialog-ui.types";

import "./dialog-ui.css";

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
      className={clsx("wd-dialog-ui__trigger", className)}
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
  return <Dialog.Portal {...props} className={clsx("wd-dialog-ui__portal", className)} ref={ref} />;
});

export const DialogBackdropUI = forwardRef(function DialogBackdropUI(
  { className, ...props }: DialogUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Backdrop {...props} className={clsx("wd-dialog-ui__backdrop", className)} ref={ref} />
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
        className={clsx("wd-dialog-ui__content", className)}
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
  return <Dialog.Title {...props} className={clsx("wd-dialog-ui__title", className)} ref={ref} />;
});

export const DialogDescriptionUI = forwardRef(function DialogDescriptionUI(
  { className, ...props }: DialogUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Dialog.Description
      {...props}
      className={clsx("wd-dialog-ui__description", className)}
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
      className={clsx("wd-dialog-ui__close", className)}
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
