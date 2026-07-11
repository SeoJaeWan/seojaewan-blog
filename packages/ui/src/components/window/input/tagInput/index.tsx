import type { ComponentPropsWithoutRef } from "react";

import { Dismiss12Regular, Search12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

/**
 * TagInput dropdown과 selected chip에 표시할 태그 항목.
 */
export interface WindowTag {
  /** 칩 배경색 (원본은 Tailwind 색 클래스 — 여기서는 CSS color 값) */
  color?: string;
  name: string;
}

/** TagInput의 open/selected visual state와 위임 callback props. */
export interface TagInputProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  /** dropdown을 열어 렌더할지 여부. 기본값은 false이다. */
  open?: boolean;
  /** trigger 클릭 시 요청된 다음 open 값을 전달한다. */
  onOpenChange?: (open: boolean) => void;
  /** 선택된 태그 제거 버튼 클릭 시 호출한다. */
  onRemoveTag?: () => void;
  /** 태그 dropdown option 클릭 시 선택된 tag를 전달한다. */
  onSelectTag?: (tag: WindowTag) => void;
  /** 현재 선택된 태그. null이면 placeholder 상태로 렌더한다. 기본값은 null이다. */
  selectedTag?: WindowTag | null;
  /** dropdown에 표시할 후보 태그 목록. 기본값은 빈 배열이다. */
  tags?: WindowTag[];
  /** trigger button aria-label. 기본값은 "태그로 검색"이다. */
  triggerLabel?: string;
}

/**
 * 폴더 창 전용 태그 필터 visual (원본 TagInput). 전달받은 open/selectedTag 상태를
 * 렌더링하고 trigger, option, remove 동작을 callback으로 위임한다.
 *
 * @param props.className tag input root에 추가할 className
 * @param props.onOpenChange trigger 클릭 시 요청된 다음 open 값을 받는 callback
 * @param props.onRemoveTag 선택된 태그 제거를 앱 필터 상태로 위임하는 callback
 * @param props.onSelectTag 태그 option 선택을 앱 필터 상태로 위임하는 callback
 * @param props.open dropdown 표시 여부. 기본값은 false
 * @param props.selectedTag 현재 선택된 태그. null이면 placeholder 상태로 렌더한다
 * @param props.tags dropdown에 표시할 후보 태그 목록. 기본값은 빈 배열
 * @param props.triggerLabel trigger button 접근성 이름. 기본값은 "태그로 검색"
 */
export const TagInput = ({
  className,
  onOpenChange,
  onRemoveTag,
  onSelectTag,
  open = false,
  selectedTag = null,
  tags = [],
  triggerLabel = "태그로 검색",
  ...props
}: TagInputProps) => (
  <div
    className={clsx("wb-tag-input", className)}
    data-active={open || selectedTag ? "true" : undefined}
    data-open={open ? "true" : undefined}
    {...props}
  >
    <button
      aria-expanded={open}
      aria-label={triggerLabel}
      className="wb-tag-input__trigger"
      onClick={() => onOpenChange?.(!open)}
      type="button"
    >
      {selectedTag ? (
        <span
          className="wb-tag-input__chip"
          style={selectedTag.color ? { background: selectedTag.color } : undefined}
        >
          {selectedTag.name}
        </span>
      ) : null}
    </button>
    {selectedTag ? (
      <button
        aria-label="태그 제거"
        className="wb-tag-input__remove"
        onClick={onRemoveTag}
        type="button"
      >
        <Dismiss12Regular aria-hidden="true" />
      </button>
    ) : null}
    <Search12Regular aria-hidden="true" className="wb-tag-input__search-icon" />
    {open ? (
      <div className="wb-tag-input__dropdown">
        {tags.map((tag) => (
          <button
            key={tag.name}
            className="wb-tag-input__chip wb-tag-input__option"
            onClick={() => onSelectTag?.(tag)}
            style={tag.color ? { background: tag.color } : undefined}
            type="button"
          >
            {tag.name}
          </button>
        ))}
      </div>
    ) : null}
  </div>
);
