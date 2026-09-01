import { ArrowSync24Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { FileViewportUIProps } from "./windowUI.types";

/**
 * File content에 full-height scroll과 text selection을 제공하고 loading visual을 대체 표시한다.
 *
 * children은 Application이 제공하는 실제 Content renderer 자리이며 Notion schema와 fetch는 소유하지 않는다.
 */
export const FileViewportUI = ({
  children,
  className,
  loading = false,
  loadingLabel = "파일 불러오는 중",
  ...props
}: FileViewportUIProps) => (
  <div
    {...props}
    aria-busy={loading ? "true" : "false"}
    className={clsx("wd-file-viewport-ui", className)}
    data-loading={loading ? "true" : "false"}
  >
    {loading ? (
      <div aria-label={loadingLabel} className="wd-file-viewport-ui__loading" role="status">
        <ArrowSync24Regular aria-hidden="true" className="wd-file-viewport-ui__spinner" />
        <span className="wd-window-ui__visually-hidden">{loadingLabel}</span>
      </div>
    ) : (
      children
    )}
  </div>
);
