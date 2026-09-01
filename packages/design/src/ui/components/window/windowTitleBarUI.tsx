import { clsx } from "clsx";

import type { WindowTitleBarUIProps } from "./windowUI.types";

/**
 * title, leading decoration과 controls를 같은 30px native header에 배치한다.
 *
 * 이동이나 fullscreen 전환은 소유하지 않으며 소비자는 native pointer/double-click props를 사용한다.
 */
export const WindowTitleBarUI = ({
  children,
  className,
  controls,
  leading,
  titleContent,
  ...props
}: WindowTitleBarUIProps) => (
  <header {...props} className={clsx("wd-window-title-bar-ui", className)}>
    {leading !== undefined || titleContent !== undefined ? (
      <>
        {leading === undefined ? null : (
          <span aria-hidden="true" className="wd-window-title-bar-ui__leading">
            {leading}
          </span>
        )}
        <div className="wd-window-title-bar-ui__title">{titleContent ?? children}</div>
      </>
    ) : (
      children
    )}
    {controls}
  </header>
);
