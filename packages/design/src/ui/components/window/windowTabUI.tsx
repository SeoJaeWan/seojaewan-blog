import { clsx } from "clsx";

import type { WindowTabUIProps } from "./windowUI.types";

/**
 * Window titlebar 안에서 18px icon과 줄어드는 한 줄 title을 표시한다.
 *
 * 어떤 Resource가 열려 있는지, active Session과 tab 전환 동작은 소유하지 않는다.
 */
export const WindowTabUI = ({
  children,
  className,
  icon,
  titleContent,
  ...props
}: WindowTabUIProps) => (
  <div {...props} className={clsx("wd-window-tab-ui", className)}>
    {icon === undefined ? null : (
      <span aria-hidden="true" className="wd-window-tab-ui__icon">
        {icon}
      </span>
    )}
    <span className="wd-window-tab-ui__title">{titleContent ?? children}</span>
  </div>
);
