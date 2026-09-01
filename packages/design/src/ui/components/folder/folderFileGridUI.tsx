import { clsx } from "clsx";

import type { FolderFileGridUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * file card를 wrap하고 size별 폭, gap과 local scrolling을 제공하는 layout group이다.
 *
 * file data, 빈 영역 action과 정렬 정책은 소비자가 소유한다.
 */
export const FolderFileGridUI = ({
  cardSize = "medium",
  className,
  role = "group",
  ...props
}: FolderFileGridUIProps) => (
  <div
    {...props}
    className={clsx("wd-folder-file-grid-ui", className)}
    data-card-size={cardSize}
    role={role}
  />
);
