import type { ReactNode } from "react";

interface ContextMenuItemPresentationProps {
  arrow?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  indicator?: ReactNode;
  trailing?: ReactNode;
}

/** ContextMenu family row의 public presentation slot을 같은 layout 계약으로 조합한다. */
export const ContextMenuItemPresentation = ({
  arrow,
  children,
  icon,
  indicator,
  trailing,
}: ContextMenuItemPresentationProps) => (
  <>
    {indicator}
    {icon === undefined ? null : (
      <span aria-hidden="true" className="wd-menu-ui__item-icon wd-context-menu-ui__item-icon">
        {icon}
      </span>
    )}
    <span className="wd-menu-ui__item-label wd-context-menu-ui__item-label">{children}</span>
    {trailing === undefined ? null : (
      <span
        aria-hidden="true"
        className="wd-menu-ui__item-trailing wd-context-menu-ui__item-trailing"
      >
        {trailing}
      </span>
    )}
    {arrow}
  </>
);
