import { clsx } from "clsx";

import { CollapsibleUI } from "../../primitives";
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
  icon,
  label,
  onOpenChange,
  open,
  panelProps,
  selected = false,
  triggerProps,
  ...props
}: FolderCategoryItemUIProps) => {
  const { className: panelClassName, ...resolvedPanelProps } = panelProps ?? {};
  const { className: triggerClassName, ...resolvedTriggerProps } = triggerProps ?? {};

  return (
    <li {...props} className={clsx("wd-folder-category-item-ui", className)}>
      <CollapsibleUI.Root
        className="wd-folder-category-item-ui__disclosure"
        defaultOpen={defaultOpen}
        disabled={disabled}
        onOpenChange={onOpenChange}
        open={open}
      >
        <CollapsibleUI.Trigger
          {...resolvedTriggerProps}
          aria-current={selected ? "page" : resolvedTriggerProps["aria-current"]}
          className={clsx("wd-folder-category-item-ui__trigger", triggerClassName)}
          data-selected={selected ? "true" : undefined}
        >
          {icon === undefined ? null : (
            <span aria-hidden="true" className="wd-folder-category-item-ui__icon">
              {icon}
            </span>
          )}
          <span className="wd-folder-category-item-ui__label">{label}</span>
        </CollapsibleUI.Trigger>
        <CollapsibleUI.Panel
          {...resolvedPanelProps}
          className={clsx("wd-folder-category-item-ui__panel", panelClassName)}
        >
          <ul className="wd-folder-category-item-ui__list">{children}</ul>
        </CollapsibleUI.Panel>
      </CollapsibleUI.Root>
    </li>
  );
};
