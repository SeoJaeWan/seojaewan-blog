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
} from "./menuUI.types";

import "./menuUI.css";

const toChangeDetails = (reason: string): MenuUIChangeDetails => ({
  reason: reason as MenuUIOpenChangeReason,
});

/**
 * 보이는 trigger로 여는 menu의 상태와 focus 범위를 구성한다.
 * 제품 action의 의미나 실행 결과는 소유하지 않는다.
 */
export function MenuRootUI({ closeParentOnEscape, onOpenChange, ...props }: MenuUIProps) {
  return (
    <BaseMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

/**
 * 사용자가 menu를 열 수 있는 보이는 button entry point를 제공한다.
 * button의 제품 문구나 action 권한은 결정하지 않는다.
 */
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

/**
 * menu role과 배치·portal 경계를 제공한다.
 * item의 제품 순서나 action 의미는 결정하지 않는다.
 */
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

/**
 * 일반 menu action의 role, disabled state, 선택 event를 제공한다.
 * 실제 제품 action의 부작용은 실행하지 않는다.
 */
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

/**
 * boolean 선택 action의 checked state와 변경 event를 제공한다.
 * 선택값을 제품 상태에 저장하지 않는다.
 */
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

/**
 * 상호 배타적인 radio item의 값·변경 event 범위를 구성한다.
 * 제품 설정값의 영속화는 소유하지 않는다.
 */
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

/**
 * radio action의 checked state와 선택 가능한 값을 제공한다.
 * 제품 설정의 의미는 해석하지 않는다.
 */
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

/**
 * action 묶음 사이의 의미상 separator를 제공한다.
 * 제품 action을 그룹화하는 규칙은 결정하지 않는다.
 */
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

/**
 * 중첩 menu의 open state와 focus 범위를 구성한다.
 * 하위 action의 제품 의미는 소유하지 않는다.
 */
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

/**
 * 중첩 menu를 여는 menuitem role과 open state를 제공한다.
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
 */
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

/**
 * 중첩 menu의 role과 기본 배치를 제공한다.
 * 하위 item의 제품 구성은 결정하지 않는다.
 */
export const MenuSubmenuContentUI = forwardRef<HTMLDivElement, MenuUIContentProps>(
  function MenuSubmenuContentUI(
    { align = "start", side = "inline-end", sideOffset = 2, ...props },
    ref,
  ) {
    return <MenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />;
  },
);

/** MenuUI가 소유하는 중첩 menu part 집합이다. 제품 action 모델은 포함하지 않는다. */
export const MenuSubmenuUI = {
  Root: MenuSubmenuRootUI,
  Trigger: MenuSubmenuTriggerUI,
  Content: MenuSubmenuContentUI,
} as const;

/** Menu compound family의 public part 집합이다. 제품 action catalog는 포함하지 않는다. */
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
