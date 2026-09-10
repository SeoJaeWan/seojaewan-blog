/**
 * @file Start pinned header, Resource tile grid와 drag reorder 제품 경계를 제공한다.
 */
import type { MouseEvent, ReactNode } from "react";

import { Button } from "@base-ui/react/button";
import {
  ChevronRight12Regular,
  Document32Regular,
  Folder32Regular,
  Link32Regular,
} from "@fluentui/react-icons";

import type {
  ResourceRef,
  StartControllerActions,
  StartReorderAction,
} from "../../../../../headless/index.js";
import { useStartPinnedDrag } from "./hooks/useStartPinnedDrag/index.js";
import { useStartPinnedKeyboard } from "./hooks/useStartPinnedKeyboard/index.js";

import "./taskbarStartPinned.css";

/** Start pinned tile에 필요한 현재 Resource 표현과 Context Menu capability다. */
export type StartPinnedItemViewModel = Readonly<{
  /** Folder, Content 또는 ExternalShortcut의 stable identity다. */
  resource: ResourceRef;
  /** 현재 Catalog 또는 Workspace에서 파생한 화면 label이다. */
  label: string;
  /** 생략하면 Resource kind별 기본 icon을 사용한다. */
  icon?: ReactNode;
  /** 현재 위치에서 가능한 Context Menu reorder Action이다. */
  reorderActions: readonly StartReorderAction[];
}>;

/** Start pinned 제품 Component 입력이다. */
export type TaskbarStartPinnedProps = Readonly<{
  /** Start Operation과 transition registry를 연결하는 public controller Action이다. */
  actions: StartControllerActions;
  /** hidden 또는 inactive pinned view에서 keyboard와 pointer interaction을 차단한다. */
  active?: boolean;
  /** 현재 Pin 순서의 Resource view model이다. */
  items: readonly StartPinnedItemViewModel[];
  /** future Context Menu가 label과 위치 capability를 소비하는 item boundary다. */
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: StartPinnedItemViewModel,
  ) => void;
  /** Folder, Content와 ExternalShortcut open Action을 상위 제품 조합에 전달한다. */
  onItemOpen?: (item: StartPinnedItemViewModel) => void;
  /** 모두 보기 semantic Action을 상위 Start 조합에 전달한다. */
  onShowAll?: () => void;
}>;

/** Resource kind에 해당하는 장식용 기본 icon을 반환한다. */
const defaultIcon = (resource: ResourceRef): ReactNode => {
  switch (resource.kind) {
    case "folder":
      return <Folder32Regular />;
    case "content":
      return <Document32Regular />;
    case "external-shortcut":
      return <Link32Regular />;
  }
};

/** Resource identity를 test와 DOM 측정이 공유할 stable key로 만든다. */
const resourceKey = (resource: ResourceRef): string => `${resource.kind}:${resource.id}`;

/**
 * Start pinned view의 6열 Resource grid, keyboard 탐색과 pointer reorder를 렌더링한다.
 *
 * Store, persistence, Window open과 browser navigation은 호출하지 않고 전달받은 Action만 사용한다.
 */
export const TaskbarStartPinned = ({
  actions,
  active = true,
  items,
  onItemContextMenu,
  onItemOpen,
  onShowAll,
}: TaskbarStartPinnedProps) => {
  const keyboard = useStartPinnedKeyboard(items.length);
  const drag = useStartPinnedDrag({ actions, items });

  return (
    <section
      aria-label="고정됨"
      className="taskbar-start-pinned"
      data-active={active ? "true" : "false"}
      inert={!active}
    >
      <header className="taskbar-start-pinned__header">
        <h2 className="taskbar-start-pinned__title">고정됨</h2>
        <Button className="taskbar-start-pinned__show-all" onClick={onShowAll} type="button">
          모두 <ChevronRight12Regular aria-hidden="true" />
        </Button>
      </header>
      {items.length === 0 ? (
        <p className="taskbar-start-pinned__empty">고정된 항목이 없습니다.</p>
      ) : (
        <div
          aria-colcount={6}
          aria-label="고정된 항목"
          aria-rowcount={Math.ceil(items.length / 6)}
          className="taskbar-start-pinned__grid"
          role="grid"
        >
          {items.map((item, index) => {
            const key = resourceKey(item.resource);
            const visual = drag.dragVisual?.key === key ? drag.dragVisual : null;
            return (
              <Button
                aria-colindex={(index % 6) + 1}
                aria-label={item.label}
                aria-rowindex={Math.floor(index / 6) + 1}
                className="taskbar-start-pinned__item"
                data-can-move-first={item.reorderActions.includes("first") ? "true" : undefined}
                data-can-move-left={item.reorderActions.includes("left") ? "true" : undefined}
                data-can-move-right={item.reorderActions.includes("right") ? "true" : undefined}
                data-dragging={visual === null ? undefined : "true"}
                data-resource-id={item.resource.id}
                data-resource-key={key}
                data-resource-kind={item.resource.kind}
                key={key}
                onClick={() => {
                  if (!drag.consumeClickSuppression()) onItemOpen?.(item);
                }}
                onContextMenu={(event) => {
                  if (drag.isDragging) {
                    event.preventDefault();
                    return;
                  }
                  onItemContextMenu?.(event, item);
                }}
                onKeyDown={(event) => keyboard.handleKeyDown(event, index)}
                onPointerDown={(event) => drag.handlePointerDown(event, item, index)}
                ref={(element) => {
                  const button = element instanceof HTMLButtonElement ? element : null;
                  keyboard.getItemRef(index)(button);
                  drag.getItemRef(key)(button);
                }}
                role="gridcell"
                style={
                  visual === null
                    ? undefined
                    : { transform: `translate(${visual.x}px, ${visual.y}px)` }
                }
                title={item.label}
                type="button"
              >
                <span aria-hidden="true" className="taskbar-start-pinned__icon">
                  {item.icon ?? defaultIcon(item.resource)}
                </span>
                <span className="taskbar-start-pinned__label">{item.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </section>
  );
};
