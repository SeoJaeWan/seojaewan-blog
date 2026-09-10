import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";

import type {
  TaskbarStartConnection,
  TaskbarStartPinnedConnectionItem,
} from "../../panels/connection/index.js";
import { TaskbarPanelWidget } from "../../panels/widget/index.js";
import { TaskbarSearch } from "../../search/input/index.js";
import { TaskbarStartAll } from "../all/index.js";
import { TaskbarStartButton, type TaskbarStartButtonProps } from "../button/index.js";
import { TaskbarStartPinned } from "../pinned/index.js";

import "./taskbarStart.css";

/** Start 상단 검색 input에 전달할 native 속성이다. query 값과 변경은 panel connection이 소유한다. */
export type TaskbarStartSearchInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "children" | "dangerouslySetInnerHTML" | "defaultValue" | "onChange" | "type" | "value"
>;

/** Start 제품 조합에 전달할 button, input, panel 연결 속성이다. */
export type TaskbarStartProps = Readonly<{
  /** Start의 active identity, query, Action과 widget callback을 제공한다. */
  connection: TaskbarStartConnection;
  /** 기존 leaf button에 전달할 속성이다. selected와 activation은 connection이 계산한다. */
  buttonProps?: Omit<TaskbarStartButtonProps, "onAction" | "selected">;
  /** 항상 표시되는 Start 상단 검색 input에 전달할 native 속성이다. */
  searchInputProps?: TaskbarStartSearchInputProps;
  /** panel portal을 붙일 문서 내 container다. 기본값은 document.body다. */
  portalContainer?: HTMLElement | null;
  /** HDJG-47이 query에 맞는 실제 Search result/detail body를 제공할 명시적 경계다. */
  renderSearchBody?: (query: string) => ReactNode;
  /** HDJG-49 Context Menu가 pinned item과 capability를 받을 명시적 경계다. */
  onPinnedItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: TaskbarStartPinnedConnectionItem,
  ) => void;
  /** HDJG-49 Context Menu가 All row를 받을 명시적 경계다. */
  onAllItemContextMenu?: ComponentPropsWithRef<typeof TaskbarStartAll>["onItemContextMenu"];
}>;

/**
 * Taskbar 시작 버튼과 Start panel, 독립된 상단 검색 input을 하나의 제품 part로 연결한다.
 *
 * active identity와 query 초기화는 `connection`의 headless 정책을 따르고, 고정 목록·모두 보기와
 * Index를 실제 제품 Component로 조합한다. Search 결과와 Context Menu는 명시적 후속 경계로 남긴다.
 */
export const TaskbarStart = ({
  buttonProps,
  connection,
  onAllItemContextMenu,
  onPinnedItemContextMenu,
  portalContainer,
  renderSearchBody,
  searchInputProps,
}: TaskbarStartProps) => {
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className: searchInputClassName,
    placeholder = "앱 및 문서 검색",
    ...inputProps
  } = searchInputProps ?? {};
  const browseActive = connection.query.length === 0;
  const pinnedActive = browseActive && connection.screen.snapshot.view === "pinned";
  const allActive = browseActive && connection.screen.snapshot.view === "all";

  return (
    <TaskbarPanelWidget
      {...connection.widget}
      portalContainer={portalContainer}
      trigger={
        <TaskbarStartButton
          {...buttonProps}
          onAction={connection.actions.trigger}
          selected={connection.widget.open}
        />
      }
      variant="start"
    >
      <div className="taskbar-start">
        <div className="taskbar-start__search">
          <TaskbarSearch
            {...inputProps}
            aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : placeholder)}
            aria-labelledby={ariaLabelledBy}
            className={searchInputClassName}
            onValueChange={(value) => {
              connection.actions.updateQuery(value);
            }}
            placeholder={placeholder}
            value={connection.query}
          />
        </div>
        <div className="taskbar-start__body">
          {browseActive ? (
            <div className="taskbar-start__browse" data-view={connection.screen.snapshot.view}>
              <div
                aria-hidden={!pinnedActive}
                className="taskbar-start__browse-view"
                data-active={pinnedActive ? "true" : "false"}
                data-view="pinned"
                inert={!pinnedActive}
              >
                <TaskbarStartPinned
                  actions={connection.pins.actions}
                  active={pinnedActive}
                  items={connection.pins.items}
                  onItemContextMenu={onPinnedItemContextMenu}
                  onItemOpen={(item) => void connection.resource.open(item.resource)}
                  onShowAll={() =>
                    connection.screen.actions.execute({ type: "set-view", view: "all" })
                  }
                />
              </div>
              <div
                aria-hidden={!allActive}
                className="taskbar-start__browse-view"
                data-active={allActive ? "true" : "false"}
                data-view="all"
                inert={!allActive}
              >
                <TaskbarStartAll
                  active={allActive}
                  groups={connection.all.groups}
                  indexOpen={connection.screen.snapshot.indexOpen}
                  onItemContextMenu={onAllItemContextMenu}
                  onItemSelect={(item) => void connection.resource.open(item.resource)}
                  onScreenAction={connection.screen.actions.execute}
                />
              </div>
            </div>
          ) : (
            <div className="taskbar-start__search-boundary" data-query={connection.query}>
              {renderSearchBody?.(connection.query)}
            </div>
          )}
        </div>
      </div>
    </TaskbarPanelWidget>
  );
};
