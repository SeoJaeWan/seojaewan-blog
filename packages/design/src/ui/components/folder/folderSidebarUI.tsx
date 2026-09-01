import { clsx } from "clsx";

import type { FolderSidebarUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * category item을 담는 folder navigation landmark와 list 구조를 제공한다.
 *
 * category tree data, selection과 route 변경은 소비자가 render하고 처리한다.
 */
export const FolderSidebarUI = ({ children, className, ...props }: FolderSidebarUIProps) => (
  <nav {...props} className={clsx("wd-folder-sidebar-ui", className)}>
    <ul className="wd-folder-sidebar-ui__list">{children}</ul>
  </nav>
);
