"use client";

import type { ComponentProps, MouseEvent } from "react";
import { useMemo } from "react";

import type { WindowItem, WindowItemActionId, WindowsPanelItemSource } from "@window/ui";
import { WindowsPanelUI } from "@window/ui";

import { useSearchResultDetail } from "./hooks/useSearchResultDetail";
import { useWindowsPanelNavigation } from "./hooks/useWindowsPanelNavigation";
import { createWindowsPanelSections } from "./utils/createWindowsPanelSections";

type WindowsPanelSearchInputProps = ComponentProps<typeof WindowsPanelUI.SearchInput>;
type WindowsPanelSearchResultsProps = ComponentProps<typeof WindowsPanelUI.SearchResults>;
type WindowsPanelViewProps = ComponentProps<typeof WindowsPanelUI.View>;

export interface TaskbarWindowPanelProps {
  /** REMOVE: Unit 6 전까지 시작 panel 이름을 전달한다; 내부 고정 한글 문구 전환 시 제거한다. */
  "aria-label": string;
  /** 검색 결과 상세 item에 표시할 action 상태 목록. */
  detailActions?: WindowsPanelSearchResultsProps["detailActions"];
  /** 시작 button의 aria-controls와 연결할 panel element ID. */
  id: string;
  /** item에 요청한 semantic action과 대상을 기능 계층에 전달한다. */
  onAction?: (action: WindowItemActionId, item: WindowItem) => void;
  /** item context menu 요청과 발생 영역을 기능 계층에 전달한다. */
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => void;
  /** pinned view에 표시할 item 목록. */
  pinnedItems?: WindowsPanelViewProps["pinnedItems"];
  /**
   * 현재 검색어에 해당하는 결과 목록.
   * 검색어가 비어 있을 때는 모두 보기 section을 만들 전체 item을 포함해야 한다.
   */
  results: WindowItem[];
  /** 검색 input의 controlled value와 native input props. */
  searchInputProps: WindowsPanelSearchInputProps;
}

/**
 * Taskbar 시작 panel의 검색 input, 검색 결과와 pinned/all view를 조립한다.
 * navigation과 상세 선택 상태를 내부에서 관리하고 item action 실행은 외부 callback에 위임한다.
 *
 * @param props.aria-label 시작 panel의 접근성 이름
 * @param props.id 시작 button aria-controls와 연결할 panel element ID
 * @param props.searchInputProps 검색 input의 controlled value와 native input props
 * @param props.results 검색 결과 또는 빈 검색어에서의 전체 item 목록
 * @param props.pinnedItems pinned view에 표시할 item 목록
 * @returns compound WindowsPanelUI로 조립한 taskbar 시작 panel
 */
export const TaskbarWindowPanel = ({
  "aria-label": ariaLabel,
  detailActions,
  id,
  onAction,
  onItemContextMenu,
  pinnedItems,
  results,
  searchInputProps,
}: TaskbarWindowPanelProps) => {
  const searchValue = String(searchInputProps.value ?? "");
  const sections = useMemo(() => createWindowsPanelSections(results), [results]);
  const navigation = useWindowsPanelNavigation();
  const searchDetail = useSearchResultDetail({ results, searchValue });
  const handleOpenItem = onAction ? (item: WindowItem) => onAction("open", item) : undefined;

  return (
    <WindowsPanelUI aria-label={ariaLabel} id={id}>
      <WindowsPanelUI.SearchInput {...searchInputProps} />
      {searchValue ? (
        <WindowsPanelUI.SearchResults
          detailActions={detailActions}
          detailItemId={searchDetail.detailItem?.id ?? null}
          onDetailAction={onAction}
          onDetailItemChange={searchDetail.onDetailItemChange}
          onItemContextMenu={
            onItemContextMenu
              ? (event, item) => onItemContextMenu(event, item, "search")
              : undefined
          }
          onSelectItem={handleOpenItem}
          results={results}
        />
      ) : (
        <WindowsPanelUI.View
          {...navigation}
          onItemContextMenu={onItemContextMenu}
          onSelectItem={handleOpenItem}
          pinnedItems={pinnedItems}
          sections={sections}
        />
      )}
    </WindowsPanelUI>
  );
};
