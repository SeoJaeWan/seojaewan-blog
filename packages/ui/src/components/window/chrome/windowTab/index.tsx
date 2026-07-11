import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowVariant } from "../../windowFrame";

export interface WindowTabProps extends ComponentPropsWithoutRef<"h2"> {
  /** title 왼쪽에 렌더할 icon slot. 없으면 기본 file icon을 사용한다. */
  icon?: ReactNode;
  /** 탭 안에 표시할 창 제목. */
  title: string;
  /** folder/file 탭 시각 variant. 기본값은 "folder"이다. */
  variant?: WindowVariant;
}

// 원본은 file이면 findFileIcon(), folder면 findCategoryIcon() — icon 미지정 시 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * 타이틀 행 좌측의 탭 모양 제목 (원본 h2).
 * 바닥에 붙는 탭 형태로, variant에 따라 radius/배경이 달라진다.
 *
 * @param props.title 탭 안에 표시할 창 제목
 * @param props.icon 제목 왼쪽에 표시할 icon slot. 없으면 기본 file icon을 사용한다
 * @param props.variant folder/file 탭 시각 variant. 기본값은 "folder"
 * @param props.className tab root에 추가할 className
 */
export const WindowTab = ({
  className,
  icon,
  title,
  variant = "folder",
  ...props
}: WindowTabProps) => (
  <h2 className={clsx("wb-window-tab", className)} data-variant={variant} {...props}>
    <span aria-hidden="true" className="wb-window-tab__icon">
      {icon ?? defaultFileIcon}
    </span>
    <span className="wb-window-tab__title">{title}</span>
  </h2>
);
