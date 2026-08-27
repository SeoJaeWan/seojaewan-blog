import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type {
  ContextMenuUIChangeDetails,
  ContextMenuUICheckboxItemProps,
  ContextMenuUIContentProps,
  ContextMenuUIItemProps,
  ContextMenuUIOpenChangeReason,
  ContextMenuUIProps,
  ContextMenuUIRadioGroupProps,
  ContextMenuUIRadioItemProps,
  ContextMenuUISeparatorProps,
  ContextMenuUISubmenuProps,
  ContextMenuUISubmenuTriggerProps,
  ContextMenuUITriggerProps,
} from "./contextMenuUI.types";

import "../menu/menuUI.css";
import "./contextMenuUI.css";

const toChangeDetails = (reason: string): ContextMenuUIChangeDetails => ({
  reason: reason as ContextMenuUIOpenChangeReason,
});

/**
 * 보조 pointer 또는 keyboard 호출로 여는 context menu 상태를 구성한다.
 * 호출 대상의 제품 action이나 business state는 소유하지 않는다.
 */
export function ContextMenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuUIProps) {
  return (
    <BaseContextMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

/**
 * 보조 pointer와 keyboard invocation을 수신하는 surface를 제공한다.
 * surface의 제품 선택 상태나 action 목록은 결정하지 않는다.
 */
export const ContextMenuTriggerUI = forwardRef<HTMLDivElement, ContextMenuUITriggerProps>(
  function ContextMenuTriggerUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Trigger
        {...props}
        className={clsx("wd-context-menu-ui__trigger", className)}
        ref={ref}
      />
    );
  },
);

/**
 * context menu role과 pointer 기준 배치·portal 경계를 제공한다.
 * action의 제품 순서나 실행 의미는 결정하지 않는다.
 */
export const ContextMenuContentUI = forwardRef<HTMLDivElement, ContextMenuUIContentProps>(
  function ContextMenuContentUI(
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
      <BaseContextMenu.Portal container={portalContainer} keepMounted={keepMounted}>
        <BaseContextMenu.Positioner
          align={align}
          alignOffset={alignOffset}
          className="wd-menu-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseContextMenu.Popup
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
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    );
  },
);

/**
 * 일반 context action의 role, disabled state, 선택 event를 제공한다.
 * 실제 제품 action의 부작용은 실행하지 않는다.
 */
export const ContextMenuItemUI = forwardRef<HTMLDivElement, ContextMenuUIItemProps>(
  function ContextMenuItemUI({ className, closeOnSelect, variant = "default", ...props }, ref) {
    return (
      <BaseContextMenu.Item
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      />
    );
  },
);

/**
 * boolean context action의 checked state와 변경 event를 제공한다.
 * 선택값을 제품 상태에 저장하지 않는다.
 */
export const ContextMenuCheckboxItemUI = forwardRef<
  HTMLDivElement,
  ContextMenuUICheckboxItemProps
>(function ContextMenuCheckboxItemUI(
  { children, className, closeOnSelect, onCheckedChange, variant = "default", ...props },
  ref,
) {
  return (
    <BaseContextMenu.CheckboxItem
      {...props}
      className={clsx("wd-menu-ui__item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      onCheckedChange={(checked, details) =>
        onCheckedChange?.(checked, toChangeDetails(details.reason))
      }
      ref={ref}
    >
      <BaseContextMenu.CheckboxItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
        ✓
      </BaseContextMenu.CheckboxItemIndicator>
      <span className="wd-menu-ui__item-label">{children}</span>
    </BaseContextMenu.CheckboxItem>
  );
});

/**
 * 상호 배타적인 context radio item의 값·변경 event 범위를 구성한다.
 * 제품 설정값의 영속화는 소유하지 않는다.
 */
export const ContextMenuRadioGroupUI = forwardRef<HTMLDivElement, ContextMenuUIRadioGroupProps>(
  function ContextMenuRadioGroupUI({ className, onValueChange, ...props }, ref) {
    return (
      <BaseContextMenu.RadioGroup
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
 * context radio action의 checked state와 선택 가능한 값을 제공한다.
 * 제품 설정의 의미는 해석하지 않는다.
 */
export const ContextMenuRadioItemUI = forwardRef<HTMLDivElement, ContextMenuUIRadioItemProps>(
  function ContextMenuRadioItemUI(
    { children, className, closeOnSelect, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseContextMenu.RadioItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      >
        <BaseContextMenu.RadioItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ●
        </BaseContextMenu.RadioItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseContextMenu.RadioItem>
    );
  },
);

/**
 * context action 묶음 사이의 의미상 separator를 제공한다.
 * 제품 action을 그룹화하는 규칙은 결정하지 않는다.
 */
export const ContextMenuSeparatorUI = forwardRef<HTMLDivElement, ContextMenuUISeparatorProps>(
  function ContextMenuSeparatorUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Separator
        {...props}
        className={clsx("wd-menu-ui__separator", className)}
        ref={ref}
      />
    );
  },
);

/**
 * 중첩 context menu의 open state와 focus 범위를 구성한다.
 * 하위 action의 제품 의미는 소유하지 않는다.
 */
export function ContextMenuSubmenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuUISubmenuProps) {
  return (
    <BaseContextMenu.SubmenuRoot
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
    />
  );
}

/**
 * 중첩 context menu를 여는 menuitem role과 open state를 제공한다.
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
 */
export const ContextMenuSubmenuTriggerUI = forwardRef<
  HTMLDivElement,
  ContextMenuUISubmenuTriggerProps
>(function ContextMenuSubmenuTriggerUI(
  { children, className, openDelay, variant = "default", ...props },
  ref,
) {
  return (
    <BaseContextMenu.SubmenuTrigger
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
    </BaseContextMenu.SubmenuTrigger>
  );
});

/**
 * 중첩 context menu의 role과 기본 배치를 제공한다.
 * 하위 item의 제품 구성은 결정하지 않는다.
 */
export const ContextMenuSubmenuContentUI = forwardRef<
  HTMLDivElement,
  ContextMenuUIContentProps
>(function ContextMenuSubmenuContentUI(
  { align = "start", side = "inline-end", sideOffset = 2, ...props },
  ref,
) {
  return (
    <ContextMenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />
  );
});

/** ContextMenuUI가 소유하는 중첩 menu part 집합이다. 제품 action 모델은 포함하지 않는다. */
export const ContextMenuSubmenuUI = {
  Root: ContextMenuSubmenuRootUI,
  Trigger: ContextMenuSubmenuTriggerUI,
  Content: ContextMenuSubmenuContentUI,
} as const;

/** ContextMenu compound family의 public part 집합이다. 제품 action catalog는 포함하지 않는다. */
export const ContextMenuUI = {
  Root: ContextMenuRootUI,
  Trigger: ContextMenuTriggerUI,
  Content: ContextMenuContentUI,
  Item: ContextMenuItemUI,
  CheckboxItem: ContextMenuCheckboxItemUI,
  RadioGroup: ContextMenuRadioGroupUI,
  RadioItem: ContextMenuRadioItemUI,
  Separator: ContextMenuSeparatorUI,
  Submenu: ContextMenuSubmenuUI,
} as const;
