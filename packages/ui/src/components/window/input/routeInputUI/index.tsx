import type { ComponentPropsWithoutRef, FocusEventHandler, ReactNode } from "react";

import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowVariant } from "../../windowFrameUI";

/**
 * RouteInputUI 드롭다운에 표시하고 선택 시 앱에 전달할 제안 항목.
 */
export interface RouteInputSuggestion {
  /** 제안 왼쪽 icon slot. 없으면 기본 file icon을 사용한다. */
  icon?: ReactNode;
  /** suggestion list key와 선택 payload에 쓰이는 id. */
  id: string;
  /** 제안 버튼에 표시할 제목. */
  title: string;
}

/** RouteInputUI의 visual state, input props와 위임 callback 계약. */
export interface RouteInputUIProps extends Omit<ComponentPropsWithoutRef<"input">, "children"> {
  /** 편집 surface와 suggestion panel을 표시할지 여부. 기본값은 false이다. */
  editing?: boolean;
  /** input 왼쪽 icon slot. 없으면 기본 file icon을 사용한다. */
  icon?: ReactNode;
  /** root에서 focus가 빠지는 native event를 기능 계층에 전달한다. */
  onRootBlur?: FocusEventHandler<HTMLDivElement>;
  /** 제안 항목 클릭 시 선택된 suggestion을 전달한다. */
  onSelectSuggestion?: (suggestion: RouteInputSuggestion) => void;
  /** 포커스 편집 상태에서 보여줄 제안 목록. 기본값은 빈 배열이다. */
  suggestions?: RouteInputSuggestion[];
  /** folder/file 주소창 시각 variant. 기본값은 "folder"이다. */
  variant?: WindowVariant;
}

const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * Windows 탐색기 주소창 visual (원본 RouteInputUI). 전달받은 editing 상태로
 * 제안 드롭다운을 그리고 focus/blur/선택 event를 기능 계층에 위임한다.
 *
 * @param props.className route input root에 추가할 className
 * @param props.editing 편집 surface와 suggestion panel 표시 여부. 기본값은 false
 * @param props.icon input 왼쪽에 표시할 icon slot. 없으면 기본 file icon을 사용한다
 * @param props.onRootBlur root focus가 subtree 밖으로 이동한 native event callback
 * @param props.onSelectSuggestion 제안 선택을 기능 계층에 위임하는 callback
 * @param props.suggestions 편집 상태에서 보여줄 route/search 제안 목록. 기본값은 빈 배열
 * @param props.variant folder/file 주소창 시각 variant. 기본값은 "folder"
 */
export const RouteInputUI = ({
  className,
  editing = false,
  icon,
  onRootBlur,
  onSelectSuggestion,
  suggestions = [],
  variant = "folder",
  ...props
}: RouteInputUIProps) => (
  <div
    className={clsx("wb-route-input", className)}
    data-editing={editing ? "true" : undefined}
    data-variant={variant}
    onBlur={onRootBlur}
  >
    <span aria-hidden="true" className="wb-route-input__icon">
      {icon ?? defaultFileIcon}
    </span>
    <input className="wb-route-input__field" {...props} />
    {editing ? (
      <div className="wb-route-input__suggestions">
        {suggestions.length === 0 ? (
          <div className="wb-route-input__empty">검색하기</div>
        ) : (
          suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className="wb-route-input__suggestion"
              onClick={() => onSelectSuggestion?.(suggestion)}
              type="button"
            >
              <span aria-hidden="true" className="wb-route-input__suggestion-icon">
                {suggestion.icon ?? defaultFileIcon}
              </span>
              <span className="wb-route-input__suggestion-title">{suggestion.title}</span>
            </button>
          ))
        )}
      </div>
    ) : null}
  </div>
);
