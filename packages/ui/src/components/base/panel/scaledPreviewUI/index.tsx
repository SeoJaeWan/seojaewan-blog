import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

/** ScaledPreviewUI가 사용하는 기본 원본 캔버스 높이. */
export const SCALED_PREVIEW_DEFAULT_BASE_HEIGHT = 1024;
/** ScaledPreviewUI가 사용하는 기본 원본 캔버스 너비. */
export const SCALED_PREVIEW_DEFAULT_BASE_WIDTH = 1920;

/** ScaledPreviewUI가 기준 캔버스와 배율을 시각적으로 표현하는 props. */
export interface ScaledPreviewUIProps extends ComponentPropsWithRef<"div"> {
  /** children이 렌더링될 원본 캔버스 높이. 기본값은 1024px이다. */
  baseHeight?: number;
  /** children이 렌더링될 원본 캔버스 너비. 기본값은 1920px이다. */
  baseWidth?: number;
  /** 기준 캔버스에 적용할 가로 배율. 기본값은 1이다. */
  scaleX?: number;
  /** 기준 캔버스에 적용할 세로 배율. 기본값은 1이다. */
  scaleY?: number;
}

/**
 * 기준 캔버스에 children을 배치한 뒤 전달받은 X/Y 배율을 적용한다.
 * 크기 관측과 배율 계산은 이 visual을 조립하는 기능 계층이 담당한다.
 *
 * @param props.baseHeight children이 배치될 원본 캔버스 높이. 기본값은 1024px
 * @param props.baseWidth children이 배치될 원본 캔버스 너비. 기본값은 1920px
 * @param props.children 기준 캔버스 위에 렌더링할 미리보기 콘텐츠
 * @param props.className 외곽 컨테이너에 추가할 className
 * @param props.ref 기능 계층이 크기를 관측할 외곽 컨테이너 ref
 * @param props.scaleX 기준 캔버스에 적용할 가로 배율. 기본값은 1
 * @param props.scaleY 기준 캔버스에 적용할 세로 배율. 기본값은 1
 * TaskHoverPanelUI의 preview slot 등에서 사용한다.
 */
export const ScaledPreviewUI = ({
  baseHeight = SCALED_PREVIEW_DEFAULT_BASE_HEIGHT,
  baseWidth = SCALED_PREVIEW_DEFAULT_BASE_WIDTH,
  children,
  className,
  ref,
  scaleX = 1,
  scaleY = 1,
  ...props
}: ScaledPreviewUIProps) => {
  return (
    <div ref={ref} className={clsx("wb-scaled-preview", className)} {...props}>
      <div
        className="wb-scaled-preview__canvas"
        style={{
          height: baseHeight,
          transform: `scale(${scaleX}, ${scaleY})`,
          width: baseWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
};
