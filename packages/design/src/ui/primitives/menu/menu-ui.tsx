import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type {
  MenuUIChangeDetails,
  MenuUICheckboxItemProps,
  MenuUIContentProps,
  MenuUIItemProps,
  MenuUIOpenChangeReason,
  MenuUIProps,
  MenuUIRadioGroupProps,
  MenuUIRadioItemProps,
  MenuUISeparatorProps,
  MenuUISubmenuProps,
  MenuUISubmenuTriggerProps,
  MenuUITriggerProps,
} from "./menu-ui.types";

import "./menu-ui.css";

const toChangeDetails = (reason: string): MenuUIChangeDetails => ({
  reason: reason as MenuUIOpenChangeReason,
});

export function MenuRootUI({ closeParentOnEscape, onOpenChange, ...props }: MenuUIProps) {
  return (
    <BaseMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

export const MenuTriggerUI = forwardRef<HTMLButtonElement, MenuUITriggerProps>(
  function MenuTriggerUI({ className, openDelay, ...props }, ref) {
    return (
      <BaseMenu.Trigger
        {...props}
        className={clsx("wd-menu-ui__trigger", className)}
        delay={openDelay}
        ref={ref}
      />
    );
  },
);

export const MenuContentUI = forwardRef<HTMLDivElement, MenuUIContentProps>(function MenuContentUI(
  {
    align = "start",
    alignOffset,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    collisionPadding = 8,
    finalFocus,
    keepMounted,
    portalContainer,
    side = "bottom",
    sideOffset = 4,
    ...props
  },
  ref,
) {
  return (
    <BaseMenu.Portal container={portalContainer} keepMounted={keepMounted}>
      <BaseMenu.Positioner
        align={align}
        alignOffset={alignOffset}
        className="wd-menu-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BaseMenu.Popup
          {...props}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel && !ariaLabelledBy ? "" : ariaLabelledBy}
          className={clsx("wd-menu-ui__content", className)}
          finalFocus={
            typeof finalFocus === "function"
              ? (interaction) => finalFocus(interaction || "unknown")
              : finalFocus
          }
          ref={ref}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
});

export const MenuItemUI = forwardRef<HTMLDivElement, MenuUIItemProps>(function MenuItemUI(
  { className, closeOnSelect, variant = "default", ...props },
  ref,
) {
  return (
    <BaseMenu.Item
      {...props}
      className={clsx("wd-menu-ui__item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      ref={ref}
    />
  );
});

export const MenuCheckboxItemUI = forwardRef<HTMLDivElement, MenuUICheckboxItemProps>(
  function MenuCheckboxItemUI(
    { children, className, closeOnSelect, onCheckedChange, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.CheckboxItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        onCheckedChange={(checked, details) =>
          onCheckedChange?.(checked, toChangeDetails(details.reason))
        }
        ref={ref}
      >
        <BaseMenu.CheckboxItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ✓
        </BaseMenu.CheckboxItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseMenu.CheckboxItem>
    );
  },
);

export const MenuRadioGroupUI = forwardRef<HTMLDivElement, MenuUIRadioGroupProps>(
  function MenuRadioGroupUI({ className, onValueChange, ...props }, ref) {
    return (
      <BaseMenu.RadioGroup
        {...props}
        className={clsx("wd-menu-ui__radio-group", className)}
        onValueChange={(value, details) =>
          onValueChange?.(String(value), toChangeDetails(details.reason))
        }
        ref={ref}
      />
    );
  },
);

export const MenuRadioItemUI = forwardRef<HTMLDivElement, MenuUIRadioItemProps>(
  function MenuRadioItemUI(
    { children, className, closeOnSelect, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.RadioItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      >
        <BaseMenu.RadioItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ●
        </BaseMenu.RadioItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseMenu.RadioItem>
    );
  },
);

export const MenuSeparatorUI = forwardRef<HTMLDivElement, MenuUISeparatorProps>(
  function MenuSeparatorUI({ className, ...props }, ref) {
    return (
      <BaseMenu.Separator
        {...props}
        className={clsx("wd-menu-ui__separator", className)}
        ref={ref}
      />
    );
  },
);

export function MenuSubmenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: MenuUISubmenuProps) {
  return (
    <BaseMenu.SubmenuRoot
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

export const MenuSubmenuTriggerUI = forwardRef<HTMLDivElement, MenuUISubmenuTriggerProps>(
  function MenuSubmenuTriggerUI(
    { children, className, openDelay, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.SubmenuTrigger
        {...props}
        className={clsx("wd-menu-ui__item", "wd-menu-ui__submenu-trigger", className)}
        data-variant={variant}
        delay={openDelay}
        ref={ref}
      >
        <span className="wd-menu-ui__item-label">{children}</span>
        <span aria-hidden="true" className="wd-menu-ui__submenu-trigger-arrow">
          ›
        </span>
      </BaseMenu.SubmenuTrigger>
    );
  },
);

export const MenuSubmenuContentUI = forwardRef<HTMLDivElement, MenuUIContentProps>(
  function MenuSubmenuContentUI(
    { align = "start", side = "inline-end", sideOffset = 2, ...props },
    ref,
  ) {
    return <MenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />;
  },
);

export const MenuSubmenuUI = {
  Root: MenuSubmenuRootUI,
  Trigger: MenuSubmenuTriggerUI,
  Content: MenuSubmenuContentUI,
} as const;

export const MenuUI = {
  Root: MenuRootUI,
  Trigger: MenuTriggerUI,
  Content: MenuContentUI,
  Item: MenuItemUI,
  CheckboxItem: MenuCheckboxItemUI,
  RadioGroup: MenuRadioGroupUI,
  RadioItem: MenuRadioItemUI,
  Separator: MenuSeparatorUI,
  Submenu: MenuSubmenuUI,
} as const;
