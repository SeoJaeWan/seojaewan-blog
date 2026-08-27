import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";

import type {
  MenuChangeDetails,
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuItemProps,
  MenuOpenChangeReason,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubmenuRootProps,
  MenuSubmenuTriggerProps,
  MenuTriggerProps,
} from "./types";

import "./menu.css";

const classNames = (...names: Array<string | undefined>) => names.filter(Boolean).join(" ");

const toChangeDetails = (reason: string): MenuChangeDetails => ({
  reason: reason as MenuOpenChangeReason,
});

export function MenuRoot({ closeParentOnEscape, onOpenChange, ...props }: MenuRootProps) {
  return (
    <BaseMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(function MenuTrigger(
  { className, openDelay, ...props },
  ref,
) {
  return (
    <BaseMenu.Trigger
      {...props}
      className={classNames("wd-menu-trigger", className)}
      delay={openDelay}
      ref={ref}
    />
  );
});

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
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
        className="wd-menu-positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BaseMenu.Popup
          {...props}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel && !ariaLabelledBy ? "" : ariaLabelledBy}
          className={classNames("wd-menu-content", className)}
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

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { className, closeOnSelect, variant = "default", ...props },
  ref,
) {
  return (
    <BaseMenu.Item
      {...props}
      className={classNames("wd-menu-item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      ref={ref}
    />
  );
});

export const MenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  function MenuCheckboxItem(
    { children, className, closeOnSelect, onCheckedChange, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.CheckboxItem
        {...props}
        className={classNames("wd-menu-item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        onCheckedChange={(checked, details) =>
          onCheckedChange?.(checked, toChangeDetails(details.reason))
        }
        ref={ref}
      >
        <BaseMenu.CheckboxItemIndicator className="wd-menu-item__indicator" keepMounted>
          ✓
        </BaseMenu.CheckboxItemIndicator>
        <span className="wd-menu-item__label">{children}</span>
      </BaseMenu.CheckboxItem>
    );
  },
);

export const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(
  function MenuRadioGroup({ className, onValueChange, ...props }, ref) {
    return (
      <BaseMenu.RadioGroup
        {...props}
        className={classNames("wd-menu-radio-group", className)}
        onValueChange={(value, details) =>
          onValueChange?.(String(value), toChangeDetails(details.reason))
        }
        ref={ref}
      />
    );
  },
);

export const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(function MenuRadioItem(
  { children, className, closeOnSelect, variant = "default", ...props },
  ref,
) {
  return (
    <BaseMenu.RadioItem
      {...props}
      className={classNames("wd-menu-item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      ref={ref}
    >
      <BaseMenu.RadioItemIndicator className="wd-menu-item__indicator" keepMounted>
        ●
      </BaseMenu.RadioItemIndicator>
      <span className="wd-menu-item__label">{children}</span>
    </BaseMenu.RadioItem>
  );
});

export const MenuSeparator = forwardRef<HTMLDivElement, MenuSeparatorProps>(function MenuSeparator(
  { className, ...props },
  ref,
) {
  return (
    <BaseMenu.Separator
      {...props}
      className={classNames("wd-menu-separator", className)}
      ref={ref}
    />
  );
});

export function MenuSubmenuRoot({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: MenuSubmenuRootProps) {
  return (
    <BaseMenu.SubmenuRoot
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

export const MenuSubmenuTrigger = forwardRef<HTMLDivElement, MenuSubmenuTriggerProps>(
  function MenuSubmenuTrigger(
    { children, className, openDelay, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.SubmenuTrigger
        {...props}
        className={classNames("wd-menu-item", "wd-menu-submenu-trigger", className)}
        data-variant={variant}
        delay={openDelay}
        ref={ref}
      >
        <span className="wd-menu-item__label">{children}</span>
        <span aria-hidden="true" className="wd-menu-submenu-trigger__arrow">
          ›
        </span>
      </BaseMenu.SubmenuTrigger>
    );
  },
);

export const MenuSubmenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  function MenuSubmenuContent(
    { align = "start", side = "inline-end", sideOffset = 2, ...props },
    ref,
  ) {
    return <MenuContent {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />;
  },
);

export const MenuSubmenu = {
  Root: MenuSubmenuRoot,
  Trigger: MenuSubmenuTrigger,
  Content: MenuSubmenuContent,
} as const;

export const MenuUI = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Separator: MenuSeparator,
  Submenu: MenuSubmenu,
} as const;
