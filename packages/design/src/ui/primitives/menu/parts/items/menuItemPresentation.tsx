import type { ReactNode } from "react";

interface MenuItemPresentationProps {
  arrow?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  indicator?: ReactNode;
  trailing?: ReactNode;
}

/** Menu family row의 public presentation slot을 같은 layout 계약으로 조합한다. */
export const MenuItemPresentation = ({
  arrow,
  children,
  icon,
  indicator,
  trailing,
}: MenuItemPresentationProps) => (
  <>
    {indicator}
    {icon === null || icon === undefined ? null : (
      <span aria-hidden="true" className="wd-menu-ui__item-icon">
        {icon}
      </span>
    )}
    <span className="wd-menu-ui__item-label">{children}</span>
    {trailing === null || trailing === undefined ? null : (
      <span aria-hidden="true" className="wd-menu-ui__item-trailing">
        {trailing}
      </span>
    )}
    {arrow}
  </>
);
