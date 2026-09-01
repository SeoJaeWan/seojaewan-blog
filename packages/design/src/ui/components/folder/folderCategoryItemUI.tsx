import { clsx } from "clsx";

import { ButtonUI, CollapsibleUI } from "../../primitives";
import type { FolderCategoryItemUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * CollapsibleUI disclosure 위에 category icon, 한 줄 label과 중첩 category slot을 표현한다.
 *
 * 제품 tree, 선택 persistence와 route 변경은 소비자가 소유한다.
 */
export const FolderCategoryItemUI = ({
  children,
  className,
  defaultOpen,
  disabled,
  disclosureLabel,
  icon,
  label,
  onOpenChange,
  onSelect,
  open,
  panelProps,
  selectionProps,
  selected = false,
  triggerProps,
  ...props
}: FolderCategoryItemUIProps) => {
  const { className: panelClassName, ...resolvedPanelProps } = panelProps ?? {};
  const { className: selectionClassName, ...resolvedSelectionProps } = selectionProps ?? {};
  const { className: triggerClassName, ...resolvedTriggerProps } = triggerProps ?? {};
  const hasChildren = children !== undefined && children !== null;
  const resolvedDisclosureLabel =
    disclosureLabel ??
    (typeof label === "string" ? `${label} 하위 항목 표시 전환` : "하위 항목 표시 전환");

  return (
    <li {...props} className={clsx("wd-folder-category-item-ui", className)}>
      <CollapsibleUI.Root
        className="wd-folder-category-item-ui__disclosure"
        defaultOpen={defaultOpen}
        disabled={disabled}
        onOpenChange={onOpenChange}
        open={open}
      >
        <div
          className="wd-folder-category-item-ui__row"
          data-selected={selected ? "true" : undefined}
        >
          {hasChildren ? (
            <CollapsibleUI.Trigger
              {...resolvedTriggerProps}
              aria-label={resolvedTriggerProps["aria-label"] ?? resolvedDisclosureLabel}
              className={clsx("wd-folder-category-item-ui__trigger", triggerClassName)}
            />
          ) : (
            <span aria-hidden="true" className="wd-folder-category-item-ui__trigger-spacer" />
          )}
          <ButtonUI
            {...resolvedSelectionProps}
            aria-current={selected ? "page" : resolvedSelectionProps["aria-current"]}
            className={clsx("wd-folder-category-item-ui__selection", selectionClassName)}
            disabled={disabled || resolvedSelectionProps.disabled}
            onClick={(event) => {
              resolvedSelectionProps.onClick?.(event);
              if (!event.defaultPrevented) onSelect?.();
            }}
          >
            {icon === undefined ? null : (
              <span aria-hidden="true" className="wd-folder-category-item-ui__icon">
                {icon}
              </span>
            )}
            <span className="wd-folder-category-item-ui__label">{label}</span>
          </ButtonUI>
        </div>
        {hasChildren ? (
          <CollapsibleUI.Panel
            {...resolvedPanelProps}
            className={clsx("wd-folder-category-item-ui__panel", panelClassName)}
          >
            <ul className="wd-folder-category-item-ui__list">{children}</ul>
          </CollapsibleUI.Panel>
        ) : null}
      </CollapsibleUI.Root>
    </li>
  );
};
