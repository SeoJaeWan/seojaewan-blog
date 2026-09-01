"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Search20Regular } from "@fluentui/react-icons";

import { ButtonUI } from "../../primitives";
import { SearchPanelUI } from "./searchPanelUI";
import { TaskbarAppListUI } from "./taskbarAppListUI";
import { TaskbarClockUI } from "./taskbarClockUI";
import { TaskbarContextMenuUI } from "./taskbarContextMenuUI";
import { TaskbarItemUI } from "./taskbarItemUI";
import { TaskbarPanelUI } from "./taskbarPanelUI";
import { TaskbarRootUI } from "./taskbarRootUI";
import { TaskbarStartButtonUI } from "./taskbarStartButtonUI";
import type { TaskbarGroupUIData, TaskbarUIProps } from "./taskbarUI.types";
import { TaskHoverPanelUI } from "./taskHoverPanelUI";
import { WindowsPanelUI } from "./windowsPanelUI";

import "./taskbarUI.css";

/** Complete Taskbar product visual: Start, Search, groups, previews, menu와 clock을 생산한다. */
export const TaskbarUI = ({
  "aria-label": ariaLabel = "작업 표시줄",
  allSections = [],
  bestSections = [],
  clockTimeZone = "Asia/Seoul",
  clockValue = null,
  detailActions = [],
  groups = [],
  onContextAction,
  onContextTaskSelect,
  onDetailAction,
  onGroupAction,
  onItemSelect,
  onPreviewClose,
  onPreviewSelect,
  pinnedItems = [],
  recommendedItems = [],
  results = [],
  searchPlaceholder = "앱, 문서 및 설정 검색",
  ...props
}: TaskbarUIProps) => {
  const [detailValue, setDetailValue] = useState<string | null>(null);
  const [previewValue, setPreviewValue] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPreviewClose = useCallback(() => {
    if (previewCloseTimerRef.current === null) return;

    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);

  const openPreview = useCallback(
    (value: string) => {
      cancelPreviewClose();
      setPreviewValue(value);
    },
    [cancelPreviewClose],
  );

  const schedulePreviewClose = useCallback(
    (value: string) => {
      cancelPreviewClose();
      previewCloseTimerRef.current = setTimeout(() => {
        setPreviewValue((currentValue) => (currentValue === value ? null : currentValue));
        previewCloseTimerRef.current = null;
      }, 120);
    },
    [cancelPreviewClose],
  );

  useEffect(() => cancelPreviewClose, [cancelPreviewClose]);

  const renderGroup = (group: TaskbarGroupUIData) => {
    const hasPreview = Boolean(group.previews?.length);
    const target = hasPreview ? (
      <TaskbarPanelUI
        initialFocus={false}
        label={`${group.label} 미리 보기`}
        onOpenChange={(open) => (open ? openPreview(group.value) : setPreviewValue(null))}
        open={previewValue === group.value}
        side="top"
        trigger={
          <TaskbarItemUI
            disabled={group.disabled}
            icon={group.icon}
            label={group.label}
            onAction={() => onGroupAction?.(group.value)}
            onFocus={() => openPreview(group.value)}
            onPointerEnter={() => openPreview(group.value)}
            onPointerLeave={() => schedulePreviewClose(group.value)}
            state={group.state}
          />
        }
      >
        <TaskHoverPanelUI
          aria-label={`${group.label} session previews`}
          items={group.previews}
          onCloseItem={(value) => onPreviewClose?.(group.value, value)}
          onPointerEnter={cancelPreviewClose}
          onPointerLeave={() => schedulePreviewClose(group.value)}
          onSelectItem={(value) => onPreviewSelect?.(group.value, value)}
        />
      </TaskbarPanelUI>
    ) : (
      <TaskbarItemUI
        disabled={group.disabled}
        icon={group.icon}
        label={group.label}
        onAction={() => onGroupAction?.(group.value)}
        state={group.state}
      />
    );

    return group.actions?.length || group.tasks?.length ? (
      <TaskbarContextMenuUI
        key={group.value}
        actions={group.actions}
        label={`${group.label} 작업`}
        onAction={(value) => onContextAction?.(group.value, value)}
        onTaskSelect={(value) => onContextTaskSelect?.(group.value, value)}
        tasks={group.tasks}
        trigger={<div className="wd-taskbar-ui__group-target">{target}</div>}
      />
    ) : (
      <div key={group.value} className="wd-taskbar-ui__group-target">
        {target}
      </div>
    );
  };

  return (
    <TaskbarRootUI {...props} aria-label={ariaLabel}>
      <TaskbarPanelUI
        align="start"
        label="시작 메뉴"
        onOpenChange={setStartOpen}
        open={startOpen}
        side="top"
        trigger={<TaskbarStartButtonUI selected={startOpen} />}
      >
        <WindowsPanelUI
          allSections={allSections}
          detailActions={detailActions}
          detailValue={detailValue}
          onDetailAction={onDetailAction}
          onDetailValueChange={setDetailValue}
          onItemSelect={onItemSelect}
          pinnedItems={pinnedItems}
          results={results}
        />
      </TaskbarPanelUI>

      <TaskbarPanelUI
        align="start"
        label="검색"
        onOpenChange={setSearchOpen}
        open={searchOpen}
        side="top"
        trigger={
          <ButtonUI className="wd-taskbar-search-trigger-ui">
            <Search20Regular aria-hidden="true" />
            <span>{searchValue || "검색"}</span>
          </ButtonUI>
        }
      >
        <SearchPanelUI
          bestSections={bestSections}
          detailActions={detailActions}
          detailValue={detailValue}
          onDetailAction={onDetailAction}
          onDetailValueChange={setDetailValue}
          onItemSelect={onItemSelect}
          onSearchValueChange={setSearchValue}
          recommendedItems={recommendedItems}
          results={results}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
        />
      </TaskbarPanelUI>

      <TaskbarAppListUI aria-label="앱 목록" role="group">
        {groups.map(renderGroup)}
      </TaskbarAppListUI>
      <TaskbarClockUI timeZone={clockTimeZone} value={clockValue} />
    </TaskbarRootUI>
  );
};
