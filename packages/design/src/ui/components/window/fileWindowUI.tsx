import { Document20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { FileViewportUI } from "./fileViewportUI";
import { RouteInputUI } from "./routeInputUI";
import { WindowControlsUI } from "./windowControlsUI";
import { WindowFrameUI } from "./windowFrameUI";
import { WindowRouteBarUI } from "./windowRouteBarUI";
import { WindowTabUI } from "./windowTabUI";
import { WindowTitleBarUI } from "./windowTitleBarUI";
import type { FileWindowUIProps } from "./windowUI.types";

/**
 * File 전용 warm chrome, pill route field와 selectable scroll viewport를 완성해 제공한다.
 *
 * 실제 Content renderer만 children으로 받으며 Resource identity, route policy와 Notion 구현은 소유하지 않는다.
 */
export const FileWindowUI = ({
  children,
  className,
  controlsProps,
  icon = <Document20Regular aria-hidden="true" />,
  routeBarProps,
  routeInputProps,
  title,
  viewportProps,
  ...props
}: FileWindowUIProps) => (
  <WindowFrameUI
    {...props}
    className={clsx("wd-file-window-ui", className)}
    routeBar={
      <WindowRouteBarUI {...routeBarProps}>
        <RouteInputUI {...routeInputProps} shape="pill" />
      </WindowRouteBarUI>
    }
    titleBar={
      <WindowTitleBarUI controls={<WindowControlsUI {...controlsProps} />}>
        <WindowTabUI icon={icon} titleContent={title} />
      </WindowTitleBarUI>
    }
    variant="file"
  >
    <FileViewportUI {...viewportProps}>{children}</FileViewportUI>
  </WindowFrameUI>
);
