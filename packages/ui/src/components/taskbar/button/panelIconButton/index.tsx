import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

import { IconButton } from "../../../base/button/iconButton";

export interface PanelIconButtonProps extends Omit<
  ComponentPropsWithoutRef<typeof IconButton>,
  "aria-label" | "children" | "selected" | "size" | "title"
> {
  /** title과 다른 접근성 이름. 기본값은 title이다. */
  "aria-label"?: string;
  /** title을 한 줄 또는 두 줄로 clamp하는 variant. 기본값은 2이다. */
  lines?: 1 | 2;
  /** true이면 selected visual과 aria-pressed를 켠다. 기본값은 false이다. */
  selected?: boolean;
  /** tile 아래에 표시할 제목. */
  title: string;
}

/**
 * WindowsPanelUI/SearchPanel 등 큰 panel 안에서 쓰는 아이콘 tile button.
 * IconButton의 lg 크기를 고정하고 제목 줄수와 selected 상태만 노출한다.
 *
 * @param props.aria-label title과 다른 접근성 이름이 필요할 때 쓰는 값
 * @param props.title tile 아래에 표시할 제목
 * @param props.lines 제목 clamp 줄수. 기본값은 2
 * @param props.selected true이면 selected visual과 aria-pressed를 켠다
 */
export const PanelIconButton = ({
  "aria-label": ariaLabel,
  className,
  lines = 2,
  selected = false,
  title,
  ...props
}: PanelIconButtonProps) => (
  <IconButton
    aria-label={ariaLabel ?? title}
    className={clsx("wb-panel-icon-button", className)}
    data-lines={lines}
    selected={selected}
    size="lg"
    {...props}
  >
    <span className="wb-panel-icon-button__title">{title}</span>
  </IconButton>
);
