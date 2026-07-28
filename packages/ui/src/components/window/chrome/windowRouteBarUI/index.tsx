import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { ArrowLeft16Regular, ArrowRight16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { WindowVariant } from "../../windowFrameUI";

export interface WindowRouteBarUIProps extends ComponentPropsWithoutRef<"div"> {
  /** true이면 뒤로 버튼을 활성 상태로 표시한다. 기본값은 false이다. */
  canGoBack?: boolean;
  /** true이면 앞으로 버튼을 활성 상태로 표시한다. 기본값은 false이다. */
  canGoForward?: boolean;
  /** 뒤로 버튼 클릭 시 호출한다. */
  onBack?: () => void;
  /** 앞으로 버튼 클릭 시 호출한다. */
  onForward?: () => void;
  /** 폴더 창 전용 태그 필터 slot (원본 TagInputUI, w-40 @md:w-80) */
  tag?: ReactNode;
  /** folder/file route bar spacing variant. 기본값은 "folder"이다. */
  variant?: WindowVariant;
}

/**
 * 창 헤더 두 번째 행 (원본 SessionRoute).
 * 뒤로/앞으로 + 주소창(children) + 폴더 창의 태그 필터.
 *
 * @param props.children 가운데 주소창 slot. 보통 RouteInputUI을 전달한다
 * @param props.tag 폴더 창 전용 태그 필터 slot. 보통 TagInputUI을 전달한다
 * @param props.canGoBack true이면 뒤로 버튼을 활성 상태로 표시한다
 * @param props.canGoForward true이면 앞으로 버튼을 활성 상태로 표시한다
 * @param props.onBack 뒤로 버튼 클릭을 앱 route history로 위임하는 callback
 * @param props.onForward 앞으로 버튼 클릭을 앱 route history로 위임하는 callback
 * @param props.variant folder/file route bar spacing variant. 기본값은 "folder"
 */
export const WindowRouteBarUI = ({
  canGoBack = false,
  canGoForward = false,
  children,
  className,
  onBack,
  onForward,
  tag,
  variant = "folder",
  ...props
}: WindowRouteBarUIProps) => (
  <div className={clsx("wb-window-route-bar", className)} data-variant={variant} {...props}>
    <div className="wb-window-route-bar__main">
      <div className="wb-window-route-bar__nav">
        <button
          aria-label="뒤로"
          className="wb-window-route-bar__nav-button"
          data-disabled={canGoBack ? undefined : "true"}
          onClick={onBack}
          type="button"
        >
          <ArrowLeft16Regular aria-hidden="true" />
        </button>
        <button
          aria-label="앞으로"
          className="wb-window-route-bar__nav-button"
          data-disabled={canGoForward ? undefined : "true"}
          onClick={onForward}
          type="button"
        >
          <ArrowRight16Regular aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
    {tag ? <div className="wb-window-route-bar__tag">{tag}</div> : null}
  </div>
);
