import { clsx } from "clsx";

import type { FolderViewerUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * sidebar와 content slots만 배치하는 container-query 기반 folder body다.
 *
 * category, file, selection, routing과 view-mode data는 소비자가 render한다.
 */
export const FolderViewerUI = ({
  children,
  className,
  contentSlot,
  sidebar,
  sidebarLabel,
  ...props
}: FolderViewerUIProps) => (
  <section {...props} className={clsx("wd-folder-viewer-ui", className)}>
    {sidebar === undefined ? null : (
      <aside aria-label={sidebarLabel} className="wd-folder-viewer-ui__sidebar">
        {sidebar}
      </aside>
    )}
    <div className="wd-folder-viewer-ui__content">{contentSlot ?? children}</div>
  </section>
);
