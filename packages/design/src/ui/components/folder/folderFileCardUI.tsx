import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import type { FolderFileCardUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * ButtonUI action 위에 3:2 cover와 한 줄 title을 배치하는 folder file card다.
 *
 * resource identity, open 방식과 navigation 실행은 native event를 받는 소비자가 소유한다.
 */
export const FolderFileCardUI = ({
  className,
  cover,
  selected = false,
  title,
  ...props
}: FolderFileCardUIProps) => (
  <ButtonUI
    {...props}
    className={clsx("wd-folder-file-card-ui", className)}
    data-selected={selected ? "true" : undefined}
  >
    <span aria-hidden="true" className="wd-folder-file-card-ui__cover">
      {cover}
    </span>
    <span className="wd-folder-file-card-ui__title">{title}</span>
  </ButtonUI>
);
