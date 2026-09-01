import { ChevronRight16Regular, Document20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import type { FolderSidebarFileItemUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * 펼친 category 아래에서 keyboard와 pointer로 활성화되는 child file row를 제공한다.
 *
 * file identity, route 변경과 선택 persistence는 소비자가 소유한다.
 */
export const FolderSidebarFileItemUI = ({
  buttonProps,
  className,
  icon = <Document20Regular aria-hidden="true" />,
  onSelect,
  selected = false,
  title,
  ...props
}: FolderSidebarFileItemUIProps) => {
  const { className: buttonClassName, ...resolvedButtonProps } = buttonProps ?? {};

  return (
    <li {...props} className={clsx("wd-folder-sidebar-file-item-ui", className)}>
      <ButtonUI
        {...resolvedButtonProps}
        aria-current={selected ? "page" : resolvedButtonProps["aria-current"]}
        className={clsx("wd-folder-sidebar-file-item-ui__action", buttonClassName)}
        data-selected={selected ? "true" : undefined}
        onClick={(event) => {
          resolvedButtonProps.onClick?.(event);
          if (!event.defaultPrevented) onSelect?.();
        }}
      >
        <ChevronRight16Regular
          aria-hidden="true"
          className="wd-folder-sidebar-file-item-ui__chevron"
        />
        <span aria-hidden="true" className="wd-folder-sidebar-file-item-ui__icon">
          {icon}
        </span>
        <span className="wd-folder-sidebar-file-item-ui__title">{title}</span>
      </ButtonUI>
    </li>
  );
};
