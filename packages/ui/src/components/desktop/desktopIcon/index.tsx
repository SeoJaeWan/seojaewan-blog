import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

import { IconButton } from "../../base/button/iconButton";

export type DesktopIconProps = Omit<
  ComponentPropsWithoutRef<typeof IconButton>,
  "children" | "selected" | "size"
>;

/**
 * 바탕화면 아이콘 버튼 하나 (원본 WallPaper의 카테고리/외부 링크 버튼).
 * IconButton primitive에 세로 라벨 배치를 더한다 (PanelIconButton과 같은 방식).
 * 크기는 부모 DesktopIconGrid의 viewMode가 결정하고,
 * 열기(PC 더블클릭/모바일 클릭)와 우클릭 메뉴는 onDoubleClick/onClick/onContextMenu로
 * 앱에 위임한다.
 *
 * @param props.icon 아이콘 위쪽에 표시할 시각 asset
 * @param props.label 아이콘 아래 label이자 접근성 이름
 * @param props.className icon root에 추가할 className
 */
export const DesktopIcon = ({ className, label, ...props }: DesktopIconProps) => (
  <IconButton className={clsx("wb-desktop-icon", className)} label={label} {...props}>
    <span className="wb-desktop-icon__label">{label}</span>
  </IconButton>
);
