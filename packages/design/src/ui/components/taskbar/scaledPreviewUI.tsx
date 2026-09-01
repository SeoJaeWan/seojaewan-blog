import type { ComponentPropsWithRef, CSSProperties } from "react";

import { clsx } from "clsx";

import "./taskbarUI.css";

interface ScaledPreviewUIProps extends ComponentPropsWithRef<"div"> {
  baseHeight?: number;
  baseWidth?: number;
}

/** 실제 Window presentation을 1920×1024 기준 canvas에서 thumbnail 영역에 맞춘 family-local visual이다. */
export const ScaledPreviewUI = ({
  baseHeight = 1024,
  baseWidth = 1920,
  children,
  className,
  style,
  ...props
}: ScaledPreviewUIProps) => (
  <div
    {...props}
    className={clsx("wd-scaled-preview-ui", className)}
    style={
      {
        ...style,
        "--wd-scaled-preview-base-height": `${baseHeight}px`,
        "--wd-scaled-preview-base-width": `${baseWidth}px`,
      } as CSSProperties
    }
  >
    <div className="wd-scaled-preview-ui__canvas">{children}</div>
  </div>
);
