"use client";

import type { Ref } from "react";
import { createContext, forwardRef, useContext, useId } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type {
  PopoverUICloseProps,
  PopoverUIContentProps,
  PopoverUIDescriptionProps,
  PopoverUIProps,
  PopoverUITitleProps,
  PopoverUITriggerProps,
} from "./popoverUI.types";

import "./popoverUI.css";

const PopoverTriggerIdContext = createContext<string | undefined>(undefined);

const PopoverUIRoot = ({ defaultOpen, onOpenChange, open, ...props }: PopoverUIProps) => {
  const triggerId = useId();

  return (
    <PopoverTriggerIdContext.Provider value={triggerId}>
      <Popover.Root
        {...props}
        defaultOpen={defaultOpen}
        defaultTriggerId={defaultOpen ? triggerId : undefined}
        modal={false}
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
    </PopoverTriggerIdContext.Provider>
  );
};

/**
 * Renders the visible control that toggles and anchors PopoverUI.Content.
 * It does not own the meaning of the action represented by the trigger.
 */
export const PopoverTriggerUI = forwardRef(function PopoverTriggerUI(
  { className, id, type = "button", ...props }: PopoverUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const triggerId = useContext(PopoverTriggerIdContext);

  return (
    <Popover.Trigger
      {...props}
      className={clsx("wd-popover-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

/**
 * Portals an anchored, non-modal supplementary surface.
 * It restores focus after dismissal but does not trap focus or block the page.
 */
export const PopoverContentUI = forwardRef(function PopoverContentUI(
  {
    align = "center",
    alignOffset,
    children,
    className,
    collisionPadding = 8,
    container,
    finalFocus,
    initialFocus,
    keepMounted,
    side = "bottom",
    sideOffset = 8,
    ...props
  }: PopoverUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Popover.Portal container={container} keepMounted={keepMounted}>
      <Popover.Positioner
        align={align}
        alignOffset={alignOffset}
        className="wd-popover-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <Popover.Popup
          {...props}
          className={clsx("wd-popover-ui__content", className)}
          finalFocus={finalFocus}
          initialFocus={initialFocus}
          ref={ref}
        >
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
});

/** Supplies the accessible heading for its owning PopoverUI.Content. */
export const PopoverTitleUI = forwardRef(function PopoverTitleUI(
  { className, ...props }: PopoverUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return <Popover.Title {...props} className={clsx("wd-popover-ui__title", className)} ref={ref} />;
});

/** Supplies accessible supporting text for its owning PopoverUI.Content. */
export const PopoverDescriptionUI = forwardRef(function PopoverDescriptionUI(
  { className, ...props }: PopoverUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Popover.Description
      {...props}
      className={clsx("wd-popover-ui__description", className)}
      ref={ref}
    />
  );
});

/** Dismisses its owning PopoverUI without deciding any business outcome. */
export const PopoverCloseUI = forwardRef(function PopoverCloseUI(
  { className, type = "button", ...props }: PopoverUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Popover.Close
      {...props}
      className={clsx("wd-popover-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});

/**
 * Groups an anchored, non-modal popover and its compound parts.
 * Use DialogUI instead when focus must be isolated from the rest of the page;
 * PopoverUI does not own application state, persistence, or navigation.
 */
export const PopoverUI = Object.assign(PopoverUIRoot, {
  Close: PopoverCloseUI,
  Content: PopoverContentUI,
  Description: PopoverDescriptionUI,
  Title: PopoverTitleUI,
  Trigger: PopoverTriggerUI,
});
