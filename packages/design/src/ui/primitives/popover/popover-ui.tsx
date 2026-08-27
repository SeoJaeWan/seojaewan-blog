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

import { Popover } from "@base-ui/react/popover";

import "./popover-ui.css";

export type PopoverUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export type PopoverUIPlacementAlign = "start" | "center" | "end";

export type PopoverUIOpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

export interface PopoverUIOpenChangeDetails {
  reason: PopoverUIOpenChangeReason;
  event: Event;
  trigger: Element | undefined;
}

export interface PopoverUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: PopoverUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** Enables modal focus and pointer behavior. The default popover is non-modal. */
  modal?: boolean;
}

export interface PopoverUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface PopoverUIContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: PopoverUIPlacementAlign;
  alignOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
  keepMounted?: boolean;
  side?: PopoverUIPlacementSide;
  sideOffset?: number;
}

export type PopoverUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type PopoverUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface PopoverUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}

const joinClassNames = (defaultClassName: string, className: string | undefined) =>
  className ? `${defaultClassName} ${className}` : defaultClassName;

const PopoverTriggerIdContext = createContext<string | undefined>(undefined);

const PopoverUIRoot = ({
  defaultOpen,
  modal = false,
  onOpenChange,
  open,
  ...props
}: PopoverUIProps) => {
  const triggerId = useId();

  return (
    <PopoverTriggerIdContext.Provider value={triggerId}>
      <Popover.Root
        {...props}
        defaultOpen={defaultOpen}
        defaultTriggerId={defaultOpen ? triggerId : undefined}
        modal={modal}
        onOpenChange={
          onOpenChange
            ? (nextOpen, details) => {
                onOpenChange(nextOpen, {
                  event: details.event,
                  reason: details.reason,
                  trigger: details.trigger,
                });
              }
            : undefined
        }
        open={open}
        triggerId={open === undefined ? undefined : triggerId}
      />
    </PopoverTriggerIdContext.Provider>
  );
};

export const PopoverTriggerUI = forwardRef(function PopoverTriggerUI(
  { className, id, type = "button", ...props }: PopoverUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const triggerId = useContext(PopoverTriggerIdContext);

  return (
    <Popover.Trigger
      {...props}
      className={joinClassNames("wd-popover-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

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
          className={joinClassNames("wd-popover-ui__content", className)}
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

export const PopoverTitleUI = forwardRef(function PopoverTitleUI(
  { className, ...props }: PopoverUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return (
    <Popover.Title
      {...props}
      className={joinClassNames("wd-popover-ui__title", className)}
      ref={ref}
    />
  );
});

export const PopoverDescriptionUI = forwardRef(function PopoverDescriptionUI(
  { className, ...props }: PopoverUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Popover.Description
      {...props}
      className={joinClassNames("wd-popover-ui__description", className)}
      ref={ref}
    />
  );
});

export const PopoverCloseUI = forwardRef(function PopoverCloseUI(
  { className, type = "button", ...props }: PopoverUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Popover.Close
      {...props}
      className={joinClassNames("wd-popover-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});

export const PopoverUI = Object.assign(PopoverUIRoot, {
  Close: PopoverCloseUI,
  Content: PopoverContentUI,
  Description: PopoverDescriptionUI,
  Title: PopoverTitleUI,
  Trigger: PopoverTriggerUI,
});
