/**
 * @file Start 모두 보기 목록과 category index overlay를 하나의 제품 Component로 조합한다.
 *
 * Catalog와 navigation은 소유하지 않고 headless View Model과 Action 경계만 소비한다.
 */
import type { MouseEvent } from "react";
import { Fragment, useId } from "react";

import { ChevronLeft12Regular, Document24Regular, Link24Regular } from "@fluentui/react-icons";

import {
  type StartScreenAction,
  type StartScreenAllGroup,
  type StartScreenAllItem,
} from "../../../../../headless/index.js";
import { useTaskbarStartAllNavigation } from "./hooks/useTaskbarStartAllNavigation/index.js";

import "./taskbarStartAll.css";

/** Start 모두 보기에서 semantic state와 item intent를 외부로 전달하는 속성이다. */
export type TaskbarStartAllProps = Readonly<{
  /** 현재 All view가 활성인지 나타내며 비활성 view의 interaction을 차단한다. */
  active?: boolean;
  /** canonical Content·ExternalShortcut section이다. */
  groups: readonly StartScreenAllGroup[];
  /** headless가 소유하는 controlled index overlay 상태다. */
  indexOpen: boolean;
  /** back과 index open 변경을 serializable Start screen Action으로 전달한다. */
  onScreenAction: (action: StartScreenAction) => void;
  /** Content 또는 ExternalShortcut row 선택 intent를 전달한다. */
  onItemSelect: (item: StartScreenAllItem) => void;
  /** 후속 Context Menu 제품이 연결할 optional row invocation 경계다. */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: StartScreenAllItem) => void;
}>;

/** Resource kind만으로 current All row의 장식 icon을 고른다. */
const ResourceIcon = ({ item }: { item: StartScreenAllItem }) =>
  item.resource.kind === "content" ? (
    <Document24Regular aria-hidden="true" />
  ) : (
    <Link24Regular aria-hidden="true" />
  );

/**
 * Content와 ExternalShortcut section, 실제 scroll heading과 4열 index overlay를 렌더링한다.
 *
 * category 선택과 Escape 뒤 focus는 유효한 heading 또는 overlay opener로 복원한다.
 */
export const TaskbarStartAll = ({
  active = true,
  groups,
  indexOpen,
  onItemContextMenu,
  onItemSelect,
  onScreenAction,
}: TaskbarStartAllProps) => {
  const titleId = useId();
  const categoryIdPrefix = useId();
  const navigation = useTaskbarStartAllNavigation({
    indexOpen,
    onIndexOpenChange: (open) => onScreenAction({ type: "set-index-open", open }),
  });

  return (
    <section aria-labelledby={titleId} className="taskbar-start-all" inert={!active}>
      <header className="taskbar-start-all__header">
        <h2 className="taskbar-start-all__title" id={titleId}>
          모두
        </h2>
        <button
          className="taskbar-start-all__back"
          onClick={() => onScreenAction({ type: "set-view", view: "pinned" })}
          type="button"
        >
          뒤로 <ChevronLeft12Regular aria-hidden="true" />
        </button>
      </header>

      <div className="taskbar-start-all__body">
        <div
          ref={navigation.overlayRef}
          aria-hidden={!indexOpen}
          aria-label="범주 인덱스"
          className="taskbar-start-all__index"
          data-open={indexOpen ? "true" : "false"}
          inert={!indexOpen}
          onKeyDown={navigation.onOverlayKeyDown}
          onPointerDown={navigation.onOverlayPointerDown}
          role="dialog"
        >
          <div className="taskbar-start-all__index-grid">
            {groups.map((group) => (
              <button
                key={group.key}
                aria-label={`${group.key} 범주로 이동`}
                className="taskbar-start-all__index-button"
                data-start-index-category={group.key}
                onClick={() => navigation.selectCategory(group.key)}
                type="button"
              >
                {group.key}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={navigation.listRef}
          aria-hidden={indexOpen}
          aria-label="모든 앱과 문서"
          className="taskbar-start-all__list"
          inert={indexOpen}
          tabIndex={-1}
        >
          {groups.length === 0 ? (
            <p className="taskbar-start-all__empty">표시할 앱이나 문서가 없습니다.</p>
          ) : null}
          {groups.map((group, groupIndex) => {
            const headingId = `${categoryIdPrefix}-category-${groupIndex}`;
            return (
              <Fragment key={group.key}>
                <h3 className="taskbar-start-all__category" id={headingId}>
                  <button
                    ref={(element) => navigation.setHeadingElement(group.key, element)}
                    aria-label={`${group.key} 범주 인덱스 열기`}
                    className="taskbar-start-all__category-button"
                    data-start-all-heading={group.key}
                    onClick={(event) => navigation.openIndex(event.currentTarget)}
                    type="button"
                  >
                    {group.key}
                  </button>
                </h3>
                <ul aria-labelledby={headingId} className="taskbar-start-all__items">
                  {group.items.map((item) => (
                    <li key={`${item.resource.kind}:${item.resource.id}`}>
                      <button
                        className="taskbar-start-all__item"
                        data-resource-kind={item.resource.kind}
                        onClick={() => onItemSelect(item)}
                        onContextMenu={
                          onItemContextMenu === undefined
                            ? undefined
                            : (event) => onItemContextMenu(event, item)
                        }
                        type="button"
                      >
                        <span aria-hidden="true" className="taskbar-start-all__item-icon">
                          <ResourceIcon item={item} />
                        </span>
                        <span className="taskbar-start-all__item-label">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};
