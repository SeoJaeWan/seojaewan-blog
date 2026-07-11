import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { clsx } from "clsx";

export interface FolderFileCardProps extends ComponentPropsWithoutRef<"button"> {
  /** 커버 이미지 slot — 없으면 placeholder 배경 */
  cover?: ReactNode;
  /** 카드 하단에 표시할 파일 제목. */
  title: string;
}

/**
 * 파일 카드 (원본 FolderIcon). 커버 3:2 + 제목.
 * 폭은 부모 FolderFileGrid의 viewMode가 결정한다.
 * 열기는 PC 더블클릭/모바일 클릭 — onDoubleClick/onClick으로 앱에 위임한다.
 *
 * @param props.title 카드 하단에 표시할 파일 제목
 * @param props.cover 카드 상단에 표시할 커버 이미지 slot
 * @param props.className card button에 추가할 className
 */
export const FolderFileCard = ({
  className,
  cover,
  title,
  type = "button",
  ...props
}: FolderFileCardProps) => (
  <button className={clsx("wb-folder-file-card", className)} type={type} {...props}>
    <span aria-hidden="true" className="wb-folder-file-card__cover">
      {cover}
    </span>
    <span className="wb-folder-file-card__title">{title}</span>
  </button>
);
