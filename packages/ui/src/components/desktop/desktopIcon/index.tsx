import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

import { IconButton } from "../../base/button/iconButton";

export interface DesktopIconProps extends Omit<
  ComponentPropsWithoutRef<typeof IconButton>,
  "aria-label" | "children" | "selected" | "size"
> {
  /** 화면 label과 다른 접근성 이름이 필요할 때 사용한다. */
  "aria-label"?: string;
  /** 아이콘 아래에 표시할 이름. */
  label: string;
}

/**
 * 바탕화면 아이콘 버튼 하나 (원본 WallPaper의 카테고리/외부 링크 버튼).
 * IconButton primitive에 세로 라벨 배치를 더한다 (PanelIconButton과 같은 방식).
 * 크기는 부모 DesktopIconGrid의 viewMode가 결정하고,
 * 열기(PC 더블클릭/모바일 클릭)와 우클릭 메뉴는 onDoubleClick/onClick/onContextMenu로
 * 앱에 위임한다.
 *
 * @param props.aria-label 화면 label과 다른 접근성 이름이 필요할 때 쓰는 값
 * @param props.label 아이콘 아래 label이자 접근성 이름
 * @param props.icon 아이콘 위쪽에 표시할 시각 asset
 * @param props.className icon root에 추가할 className
 */
export const DesktopIcon = ({
  "aria-label": ariaLabel,
  className,
  label,
  ...props
}: DesktopIconProps) => (
  <IconButton
    aria-label={ariaLabel ?? label}
    className={clsx("wb-desktop-icon", className)}
    {...props}
  >
    <span className="wb-desktop-icon__label">{label}</span>
  </IconButton>
);
