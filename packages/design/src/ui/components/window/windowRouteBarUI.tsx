import { ArrowLeft16Regular, ArrowRight16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { IconButtonUI } from "../../primitives/iconButton";
import type { WindowRouteBarUIProps, WindowRouteUILabels } from "./windowUI.types";

const defaultLabels: WindowRouteUILabels = {
  back: "뒤로",
  forward: "앞으로",
};

/**
 * history icon actions, route field와 선택적 tag field를 하나의 36px navigation row에 배치한다.
 *
 * history stack, route 실행과 filtering 정책은 소비자가 소유하며 이 component는 방향만 보고한다.
 */
export const WindowRouteBarUI = ({
  backDisabled = false,
  children,
  className,
  forwardDisabled = false,
  labels,
  onNavigate,
  tagInput,
  ...props
}: WindowRouteBarUIProps) => {
  const resolvedLabels = { ...defaultLabels, ...labels };

  return (
    <nav {...props} className={clsx("wd-window-route-bar-ui", className)}>
      <div className="wd-window-route-bar-ui__history">
        <IconButtonUI
          className="wd-window-route-bar-ui__control"
          disabled={backDisabled}
          icon={<ArrowLeft16Regular aria-hidden="true" />}
          label={resolvedLabels.back}
          onClick={() => onNavigate?.({ direction: "back" })}
          size="sm"
        />
        <IconButtonUI
          className="wd-window-route-bar-ui__control"
          disabled={forwardDisabled}
          icon={<ArrowRight16Regular aria-hidden="true" />}
          label={resolvedLabels.forward}
          onClick={() => onNavigate?.({ direction: "forward" })}
          size="sm"
        />
      </div>
      <div className="wd-window-route-bar-ui__route">{children}</div>
      {tagInput === undefined ? null : (
        <div className="wd-window-route-bar-ui__tag">{tagInput}</div>
      )}
    </nav>
  );
};
