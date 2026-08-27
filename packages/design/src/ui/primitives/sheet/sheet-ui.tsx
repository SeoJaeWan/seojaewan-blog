"use client";

import type { Ref } from "react";
import { createContext, forwardRef, useContext, useId } from "react";

import { Drawer } from "@base-ui/react/drawer";
import { clsx } from "clsx";

import type {
  SheetUIBackdropProps,
  SheetUICloseProps,
  SheetUIContentProps,
  SheetUIDescriptionProps,
  SheetUIHandleProps,
  SheetUIPortalProps,
  SheetUIProps,
  SheetUITitleProps,
  SheetUITriggerProps,
  SheetUIViewportProps,
} from "./sheet-ui.types";

import "./sheet-ui.css";

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
      className={clsx("wd-sheet-ui__trigger", className)}
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
  return <Drawer.Portal {...props} className={clsx("wd-sheet-ui__portal", className)} ref={ref} />;
});

export const SheetBackdropUI = forwardRef(function SheetBackdropUI(
  { className, ...props }: SheetUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Backdrop {...props} className={clsx("wd-sheet-ui__backdrop", className)} ref={ref} />
  );
});

export const SheetViewportUI = forwardRef(function SheetViewportUI(
  { className, ...props }: SheetUIViewportProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Viewport {...props} className={clsx("wd-sheet-ui__viewport", className)} ref={ref} />
  );
});

export const SheetContentUI = forwardRef(function SheetContentUI(
  { className, finalFocus, initialFocus, ...props }: SheetUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Drawer.Popup
      {...props}
      className={clsx("wd-sheet-ui__content", className)}
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
      className={clsx("wd-sheet-ui__handle", className)}
      ref={ref}
    />
  );
});

export const SheetTitleUI = forwardRef(function SheetTitleUI(
  { className, ...props }: SheetUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return <Drawer.Title {...props} className={clsx("wd-sheet-ui__title", className)} ref={ref} />;
});

export const SheetDescriptionUI = forwardRef(function SheetDescriptionUI(
  { className, ...props }: SheetUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Drawer.Description
      {...props}
      className={clsx("wd-sheet-ui__description", className)}
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
      className={clsx("wd-sheet-ui__close", className)}
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
