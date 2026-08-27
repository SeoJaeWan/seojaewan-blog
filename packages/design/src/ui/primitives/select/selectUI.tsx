"use client";

import { createContext, forwardRef, useContext, useState } from "react";

import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";

import type {
  SelectUIChangeDetails,
  SelectUIClearProps,
  SelectUIContentProps,
  SelectUIItemProps,
  SelectUILabelProps,
  SelectUIListProps,
  SelectUIProps,
  SelectUITriggerProps,
  SelectUIValueProps,
} from "./selectUI.types";

import "./selectUI.css";

interface SelectUIContextValue {
  clear: () => void;
  disabled: boolean;
  hasValue: boolean;
}

const SelectUIContext = createContext<SelectUIContextValue>({
  clear: () => undefined,
  disabled: false,
  hasValue: false,
});

const toChangeDetails = (reason: string): SelectUIChangeDetails => ({
  reason: reason as SelectUIChangeDetails["reason"],
});

/** Coordinates predefined single selection; it does not own tags or other application state. */
export function SelectRootUI({
  defaultValue = null,
  disabled = false,
  items,
  onOpenChange,
  onValueChange,
  readOnly = false,
  value,
  ...props
}: SelectUIProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(defaultValue);
  const selectedValue = value === undefined ? uncontrolledValue : value;

  const changeValue = (nextValue: string | null, details: SelectUIChangeDetails) => {
    if (disabled || readOnly) return;
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue, details);
  };

  return (
    <SelectUIContext.Provider
      value={{
        clear: () => changeValue(null, { reason: "clear-press" }),
        disabled: disabled || readOnly,
        hasValue: selectedValue !== null,
      }}
    >
      <BaseSelect.Root
        {...props}
        disabled={disabled}
        itemToStringLabel={(itemValue) =>
          items.find((item) => item.value === itemValue)?.label ?? itemValue
        }
        itemToStringValue={(itemValue) => itemValue}
        items={Object.fromEntries(items.map((item) => [item.value, item.label]))}
        onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
        onValueChange={(nextValue, details) =>
          changeValue(nextValue, toChangeDetails(details.reason))
        }
        readOnly={readOnly}
        value={selectedValue}
      />
    </SelectUIContext.Provider>
  );
}

/** Labels the select for assistive technology; it does not provide application validation. */
export const SelectLabelUI = forwardRef<HTMLDivElement, SelectUILabelProps>(function SelectLabelUI(
  { className, ...props },
  ref,
) {
  return (
    <BaseSelect.Label {...props} className={clsx("wd-select-ui__label", className)} ref={ref} />
  );
});

/** Opens the input-free option surface; it does not mutate business state directly. */
export const SelectTriggerUI = forwardRef<HTMLButtonElement, SelectUITriggerProps>(
  function SelectTriggerUI({ children, className, type = "button", ...props }, ref) {
    return (
      <BaseSelect.Trigger
        {...props}
        className={clsx("wd-select-ui__trigger", className)}
        ref={ref}
        type={type}
      >
        {children}
        <span aria-hidden="true" className="wd-select-ui__trigger-icon">
          ▾
        </span>
      </BaseSelect.Trigger>
    );
  },
);

/** Displays the current predefined label; it does not edit or persist the selected value. */
export const SelectValueUI = forwardRef<HTMLSpanElement, SelectUIValueProps>(function SelectValueUI(
  { className, ...props },
  ref,
) {
  return (
    <BaseSelect.Value {...props} className={clsx("wd-select-ui__value", className)} ref={ref} />
  );
});

/** Clears the current selection; it does not remove items or edit multi-tag data. */
export const SelectClearUI = forwardRef<HTMLButtonElement, SelectUIClearProps>(
  function SelectClearUI(
    { children = "Clear", className, disabled, onClick, type = "button", ...props },
    ref,
  ) {
    const context = useContext(SelectUIContext);
    const actionDisabled = context.disabled || disabled || !context.hasValue;

    return (
      <button
        {...props}
        className={clsx("wd-select-ui__clear", className)}
        disabled={actionDisabled}
        onClick={(event) => {
          if (actionDisabled) return;
          context.clear();
          onClick?.(event);
        }}
        ref={ref}
        type={type}
      >
        {children}
      </button>
    );
  },
);

/** Positions the listbox in a portal; it does not fetch or transform application data. */
export const SelectContentUI = forwardRef<HTMLDivElement, SelectUIContentProps>(
  function SelectContentUI(
    {
      align = "start",
      alignOffset,
      className,
      collisionPadding = 8,
      portalContainer,
      side = "bottom",
      sideOffset = 4,
      ...props
    },
    ref,
  ) {
    return (
      <BaseSelect.Portal container={portalContainer}>
        <BaseSelect.Positioner
          align={align}
          alignItemWithTrigger={false}
          alignOffset={alignOffset}
          className="wd-select-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseSelect.Popup
            {...props}
            className={clsx("wd-select-ui__content", className)}
            ref={ref}
          />
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    );
  },
);

/** Provides listbox semantics for predefined options; it does not own the selected tag. */
export const SelectListUI = forwardRef<HTMLDivElement, SelectUIListProps>(function SelectListUI(
  { className, ...props },
  ref,
) {
  return <BaseSelect.List {...props} className={clsx("wd-select-ui__list", className)} ref={ref} />;
});

/** Represents one predefined option; it does not create or persist application tags. */
export const SelectItemUI = forwardRef<HTMLElement, SelectUIItemProps>(function SelectItemUI(
  { children, className, ...props },
  ref,
) {
  return (
    <BaseSelect.Item {...props} className={clsx("wd-select-ui__item", className)} ref={ref}>
      <BaseSelect.ItemIndicator className="wd-select-ui__item-indicator" keepMounted>
        ✓
      </BaseSelect.ItemIndicator>
      <BaseSelect.ItemText className="wd-select-ui__item-label">{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
});

/** Project-owned compound API for input-free single selection, not a multi-tag editor. */
export const SelectUI = {
  Root: SelectRootUI,
  Label: SelectLabelUI,
  Trigger: SelectTriggerUI,
  Value: SelectValueUI,
  Clear: SelectClearUI,
  Content: SelectContentUI,
  List: SelectListUI,
  Item: SelectItemUI,
} as const;
