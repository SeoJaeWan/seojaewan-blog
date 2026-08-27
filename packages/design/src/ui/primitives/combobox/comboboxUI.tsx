"use client";

import { createContext, forwardRef, useContext, useId } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type {
  ComboboxUIChangeDetails,
  ComboboxUIClearProps,
  ComboboxUIContentProps,
  ComboboxUIEmptyProps,
  ComboboxUIInputGroupProps,
  ComboboxUIInputProps,
  ComboboxUIItemProps,
  ComboboxUILabelProps,
  ComboboxUIListProps,
  ComboboxUIProps,
  ComboboxUITriggerProps,
} from "./comboboxUI.types";

import "./comboboxUI.css";

const toChangeDetails = (reason: string): ComboboxUIChangeDetails => ({
  reason: reason as ComboboxUIChangeDetails["reason"],
});

interface ComboboxUIContextValue {
  inputId: string | undefined;
  items: readonly ComboboxUIProps["items"][number][];
}

const ComboboxUIContext = createContext<ComboboxUIContextValue>({
  inputId: undefined,
  items: [],
});

/** Coordinates predefined filtering and single selection; it does not own routes or navigation. */
export function ComboboxRootUI({
  items,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  ...props
}: ComboboxUIProps) {
  const labels = new Map(items.map((item) => [item.value, item.label]));
  const inputId = useId();

  return (
    <ComboboxUIContext.Provider value={{ inputId, items }}>
      <BaseCombobox.Root
        {...props}
        itemToStringLabel={(value) => labels.get(value) ?? value}
        itemToStringValue={(value) => value}
        items={items.map((item) => item.value)}
        onInputValueChange={(value, details) =>
          onInputValueChange?.(value, toChangeDetails(details.reason))
        }
        onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
        onValueChange={(value, details) => onValueChange?.(value, toChangeDetails(details.reason))}
      />
    </ComboboxUIContext.Provider>
  );
}

/** Labels the combobox for assistive technology; it does not provide application validation. */
export const ComboboxLabelUI = forwardRef<HTMLLabelElement, ComboboxUILabelProps>(
  function ComboboxLabelUI({ className, htmlFor, ...props }, ref) {
    const { inputId } = useContext(ComboboxUIContext);

    return (
      <label
        {...props}
        className={clsx("wd-combobox-ui__label", className)}
        htmlFor={htmlFor ?? inputId}
        ref={ref}
      />
    );
  },
);

/** Groups the input controls visually; it does not own filtering or selected data. */
export const ComboboxInputGroupUI = forwardRef<HTMLDivElement, ComboboxUIInputGroupProps>(
  function ComboboxInputGroupUI({ className, ...props }, ref) {
    return (
      <BaseCombobox.InputGroup
        {...props}
        className={clsx("wd-combobox-ui__input-group", className)}
        ref={ref}
      />
    );
  },
);

/** Accepts a filter query for predefined items; it does not accept free-form selections. */
export const ComboboxInputUI = forwardRef<HTMLInputElement, ComboboxUIInputProps>(
  function ComboboxInputUI({ className, id, ...props }, ref) {
    const { inputId } = useContext(ComboboxUIContext);

    return (
      <BaseCombobox.Input
        {...props}
        className={clsx("wd-combobox-ui__input", className)}
        id={id ?? inputId}
        ref={ref}
      />
    );
  },
);

/** Opens the predefined option surface; it does not perform application routing. */
export const ComboboxTriggerUI = forwardRef<HTMLButtonElement, ComboboxUITriggerProps>(
  function ComboboxTriggerUI({ children = "▾", className, type = "button", ...props }, ref) {
    return (
      <BaseCombobox.Trigger
        {...props}
        className={clsx("wd-combobox-ui__trigger", className)}
        ref={ref}
        type={type}
      >
        {children}
      </BaseCombobox.Trigger>
    );
  },
);

/** Clears input and selection state; it does not mutate application-owned option data. */
export const ComboboxClearUI = forwardRef<HTMLButtonElement, ComboboxUIClearProps>(
  function ComboboxClearUI({ children = "×", className, type = "button", ...props }, ref) {
    return (
      <BaseCombobox.Clear
        {...props}
        className={clsx("wd-combobox-ui__clear", className)}
        ref={ref}
        type={type}
      >
        {children}
      </BaseCombobox.Clear>
    );
  },
);

/** Positions the listbox in a portal; it does not fetch or transform option data. */
export const ComboboxContentUI = forwardRef<HTMLDivElement, ComboboxUIContentProps>(
  function ComboboxContentUI(
    {
      align = "start",
      alignOffset,
      className,
      collisionPadding = 8,
      keepMounted,
      portalContainer,
      side = "bottom",
      sideOffset = 4,
      ...props
    },
    ref,
  ) {
    return (
      <BaseCombobox.Portal container={portalContainer} keepMounted={keepMounted}>
        <BaseCombobox.Positioner
          align={align}
          alignOffset={alignOffset}
          className="wd-combobox-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseCombobox.Popup
            {...props}
            className={clsx("wd-combobox-ui__content", className)}
            ref={ref}
          />
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    );
  },
);

/** Provides listbox semantics for predefined items; it does not own the filter query. */
export const ComboboxListUI = forwardRef<HTMLDivElement, ComboboxUIListProps>(
  function ComboboxListUI({ className, renderItem, ...props }, ref) {
    const { items } = useContext(ComboboxUIContext);

    return (
      <BaseCombobox.List {...props} className={clsx("wd-combobox-ui__list", className)} ref={ref}>
        {(value: string) => {
          const option = items.find((item) => item.value === value);
          if (!option) return null;

          return (
            <ComboboxItemUI disabled={option.disabled} value={option.value}>
              {renderItem?.(option) ?? option.label}
            </ComboboxItemUI>
          );
        }}
      </BaseCombobox.List>
    );
  },
);

/** Represents one predefined selectable value; it does not create or persist options. */
export const ComboboxItemUI = forwardRef<HTMLDivElement, ComboboxUIItemProps>(
  function ComboboxItemUI({ children, className, ...props }, ref) {
    return (
      <BaseCombobox.Item {...props} className={clsx("wd-combobox-ui__item", className)} ref={ref}>
        <BaseCombobox.ItemIndicator className="wd-combobox-ui__item-indicator" keepMounted>
          ✓
        </BaseCombobox.ItemIndicator>
        <span className="wd-combobox-ui__item-label">{children}</span>
      </BaseCombobox.Item>
    );
  },
);

/** Announces an empty filtered result; it does not change the query or option collection. */
export const ComboboxEmptyUI = forwardRef<HTMLDivElement, ComboboxUIEmptyProps>(
  function ComboboxEmptyUI({ className, ...props }, ref) {
    return (
      <BaseCombobox.Empty
        {...props}
        className={clsx("wd-combobox-ui__empty", className)}
        ref={ref}
      />
    );
  },
);

/** Project-owned compound API for predefined combobox composition, not application route state. */
export const ComboboxUI = {
  Root: ComboboxRootUI,
  Label: ComboboxLabelUI,
  InputGroup: ComboboxInputGroupUI,
  Input: ComboboxInputUI,
  Trigger: ComboboxTriggerUI,
  Clear: ComboboxClearUI,
  Content: ComboboxContentUI,
  List: ComboboxListUI,
  Item: ComboboxItemUI,
  Empty: ComboboxEmptyUI,
} as const;
