"use client";

import type { Ref } from "react";
import { createContext, forwardRef, useContext, useId } from "react";

import { Tooltip } from "@base-ui/react/tooltip";
import { clsx } from "clsx";

import type {
  TooltipUIContentProps,
  TooltipUIGroupProps,
  TooltipUIProps,
  TooltipUITriggerProps,
} from "./tooltip-ui.types";

import "./tooltip-ui.css";

const TooltipGroupContext = createContext(false);
const TooltipDelayContext = createContext<number | undefined>(undefined);
const TooltipTriggerIdContext = createContext<string | undefined>(undefined);
const TooltipContentIdContext = createContext<string | undefined>(undefined);

const TooltipRoot = ({ defaultOpen, delay, onOpenChange, open, ...props }: TooltipUIProps) => {
  const hasSharedGroup = useContext(TooltipGroupContext);
  const triggerId = useId();
  const contentId = useId();
  const root = (
    <TooltipTriggerIdContext.Provider value={triggerId}>
      <TooltipContentIdContext.Provider value={contentId}>
        <TooltipDelayContext.Provider value={delay}>
          <Tooltip.Root
            {...props}
            defaultOpen={defaultOpen}
            defaultTriggerId={defaultOpen ? triggerId : undefined}
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
        </TooltipDelayContext.Provider>
      </TooltipContentIdContext.Provider>
    </TooltipTriggerIdContext.Provider>
  );

  return hasSharedGroup ? root : <Tooltip.Provider delay={delay}>{root}</Tooltip.Provider>;
};

export const TooltipGroupUI = ({ children, closeDelay, delay, timeout }: TooltipUIGroupProps) => (
  <TooltipGroupContext.Provider value>
    <Tooltip.Provider closeDelay={closeDelay} delay={delay} timeout={timeout}>
      {children}
    </Tooltip.Provider>
  </TooltipGroupContext.Provider>
);

export const TooltipTriggerUI = forwardRef(function TooltipTriggerUI(
  {
    "aria-describedby": ariaDescribedBy,
    className,
    delay,
    id,
    type = "button",
    ...props
  }: TooltipUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const rootDelay = useContext(TooltipDelayContext);
  const triggerId = useContext(TooltipTriggerIdContext);
  const contentId = useContext(TooltipContentIdContext);

  return (
    <Tooltip.Trigger
      {...props}
      aria-describedby={[ariaDescribedBy, contentId].filter(Boolean).join(" ") || undefined}
      className={clsx("wd-tooltip-ui__trigger", className)}
      delay={delay ?? rootDelay}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});

export const TooltipContentUI = forwardRef(function TooltipContentUI(
  {
    align = "center",
    alignOffset,
    children,
    className,
    collisionPadding = 8,
    container,
    id,
    keepMounted,
    side = "top",
    sideOffset = 8,
    ...props
  }: TooltipUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  const contentId = useContext(TooltipContentIdContext);

  return (
    <Tooltip.Portal container={container} keepMounted={keepMounted}>
      <Tooltip.Positioner
        align={align}
        alignOffset={alignOffset}
        className="wd-tooltip-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <Tooltip.Popup
          {...props}
          className={clsx("wd-tooltip-ui__content", className)}
          id={contentId ?? id}
          ref={ref}
          role="tooltip"
        >
          {children}
        </Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  );
});

export const TooltipUI = Object.assign(TooltipRoot, {
  Content: TooltipContentUI,
  Group: TooltipGroupUI,
  Trigger: TooltipTriggerUI,
});
