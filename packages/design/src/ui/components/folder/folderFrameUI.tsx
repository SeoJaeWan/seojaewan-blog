import { clsx } from "clsx";

import { WindowFrameUI, WindowTitleBarUI } from "../window";
import type { FolderFrameUIProps } from "./folderUI.types";

import "./folderUI.css";

/**
 * 검증된 Window presentation surface에 folder title slots와 본문을 조합한다.
 *
 * content/folder 원본 데이터, 창 lifecycle과 control action은 소비자가 소유한다.
 */
export const FolderFrameUI = ({
  children,
  className,
  controls,
  leading,
  titleBarProps,
  titleContent,
  ...props
}: FolderFrameUIProps) => {
  const { className: titleBarClassName, ...resolvedTitleBarProps } = titleBarProps ?? {};

  return (
    <WindowFrameUI
      {...props}
      className={clsx("wd-folder-frame-ui", className)}
      titleBar={
        <WindowTitleBarUI
          {...resolvedTitleBarProps}
          className={clsx("wd-folder-frame-ui__title-bar", titleBarClassName)}
          controls={controls}
          leading={leading}
          titleContent={titleContent}
        />
      }
    >
      {children}
    </WindowFrameUI>
  );
};
