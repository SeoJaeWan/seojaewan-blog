import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";

import { ChevronDown16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import folderIconSrc from "../../../../assets/folder.png";

/**
 * FolderCategoryItem이 펼쳤을 때 렌더할 하위 파일 항목.
 */
export interface FolderCategoryChildItem {
  /** 파일 항목 왼쪽 icon slot. 없으면 기본 file icon을 사용한다. */
  icon?: ReactNode;
  /** 선택/우클릭 위임에 쓰이는 파일 항목 id. */
  id: string;
  /** 파일 항목 버튼에 표시할 제목. */
  title: string;
}

/** FolderCategoryItem의 visual state와 위임 callback props. */
export interface FolderCategoryItemProps extends Omit<
  ComponentPropsWithoutRef<"li">,
  "onContextMenu" | "onSelect"
> {
  /** 하위 파일 목록을 펼쳐 렌더할지 여부. 기본값은 false이다. */
  expanded?: boolean;
  /** 카테고리 row 왼쪽 icon slot. 없으면 기본 folder icon을 사용한다. */
  icon?: ReactNode;
  /** 펼쳤을 때 보여줄 하위 파일 목록 */
  items?: FolderCategoryChildItem[];
  /** 카테고리 row에 표시할 이름. */
  label: string;
  /** 카테고리 row 우클릭 시 context menu를 앱에 위임한다. */
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 하위 파일 항목 우클릭 — 파일 context menu 위임 */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: FolderCategoryChildItem) => void;
  /** chevron 클릭 시 요청된 다음 expanded 값을 전달한다. */
  onExpandedChange?: (expanded: boolean) => void;
  /** 카테고리 row 클릭 시 호출한다. */
  onSelect?: () => void;
  /** 하위 파일 항목 클릭 시 선택된 item을 전달한다. */
  onSelectItem?: (item: FolderCategoryChildItem) => void;
  /** 현재 폴더가 이 카테고리를 보고 있는지 */
  selected?: boolean;
}

const defaultFolderIcon = <img alt="" draggable={false} src={folderIconSrc} />;
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * 사이드바 카테고리 항목 (원본 FolderCategory).
 * 전달받은 expanded 상태로 하위 파일 목록을 그리고, 모든 동작을 callback으로 위임한다.
 *
 * @param props.className category li root에 추가할 className
 * @param props.expanded 하위 파일 목록을 펼쳐 렌더할지 여부. 기본값은 false
 * @param props.icon 카테고리 row 왼쪽 icon slot
 * @param props.label 카테고리 row에 표시할 이름
 * @param props.items 펼쳤을 때 보여줄 하위 파일 목록
 * @param props.onContextMenu 카테고리 row 우클릭 메뉴를 앱에 위임하는 callback
 * @param props.onExpandedChange chevron 클릭 시 요청된 다음 expanded 값을 받는 callback
 * @param props.onItemContextMenu 하위 파일 항목 우클릭 메뉴를 앱에 위임하는 callback
 * @param props.onSelect 카테고리 row 클릭을 앱 route 변경으로 위임하는 callback
 * @param props.onSelectItem 하위 파일 항목 클릭을 앱 route 변경/열기로 위임하는 callback
 * @param props.selected 현재 폴더가 이 카테고리를 보고 있는지 여부. 기본값은 false
 */
export const FolderCategoryItem = ({
  className,
  expanded = false,
  icon,
  items = [],
  label,
  onContextMenu,
  onExpandedChange,
  onItemContextMenu,
  onSelect,
  onSelectItem,
  selected = false,
  ...props
}: FolderCategoryItemProps) => (
  <li className={clsx("wb-folder-category", className)} {...props}>
    <div className="wb-folder-category__row" data-selected={selected ? "true" : undefined}>
      <button
        aria-expanded={expanded}
        aria-label={expanded ? `${label} 접기` : `${label} 펼치기`}
        className="wb-folder-category__toggle"
        data-expanded={expanded ? "true" : undefined}
        onClick={() => onExpandedChange?.(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown16Regular aria-hidden="true" />
        ) : (
          <ChevronRight16Regular aria-hidden="true" />
        )}
      </button>
      <button
        className="wb-folder-category__button"
        onClick={onSelect}
        onContextMenu={onContextMenu}
        type="button"
      >
        <span aria-hidden="true" className="wb-folder-category__icon">
          {icon ?? defaultFolderIcon}
        </span>
        {label}
      </button>
    </div>
    {expanded && items.length > 0 ? (
      <ul className="wb-folder-category__items">
        {items.map((item) => (
          <li key={item.id} className="wb-folder-category__item">
            <button
              className="wb-folder-category__item-button"
              onClick={() => onSelectItem?.(item)}
              onContextMenu={(event) => onItemContextMenu?.(event, item)}
              type="button"
            >
              <span aria-hidden="true" className="wb-folder-category__item-chevron">
                <ChevronRight16Regular />
              </span>
              <span aria-hidden="true" className="wb-folder-category__icon">
                {item.icon ?? defaultFileIcon}
              </span>
              <span className="wb-folder-category__item-title">{item.title}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null}
  </li>
);
