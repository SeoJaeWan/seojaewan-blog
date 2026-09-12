import type { MouseEvent } from "react";

import { Button } from "@base-ui/react/button";
import {
  ArrowLeft16Regular,
  ChevronRight16Regular,
  FolderOpen16Regular,
  Open16Regular,
} from "@fluentui/react-icons";

import type { ResourceRef } from "../../../../../headless/index.js";
import { TaskbarStartIcon, type TaskbarStartResourceIconResolver } from "../../start/icon/index.js";
import type { TaskbarSearchOwner } from "../hooks/useTaskbarSearchOwner/index.js";

import "./taskbarSearchBody.css";

/**
 * 공통 Resource 대상의 결과·recent·추천·detail을 실제 Search Action에 연결한다.
 * 두 Surface의 기본 본문이며 ResourceRef 기반 Context Menu 연결점만 제공한다.
 */
export const TaskbarSearchBody = ({
  owner,
  resolveIcon,
  onItemContextMenu,
}: {
  owner: TaskbarSearchOwner;
  resolveIcon?: TaskbarStartResourceIconResolver;
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, resource: ResourceRef) => void;
}) => {
  const { viewModel, snapshot, blocked, title, path, open } = owner;
  const panel = owner.panel;
  let rowIndex = 0;
  owner.rows.current = [];
  /** 표시 이름과 ResourceRef를 별도 row·detail button으로 조합한다. */
  const list = (label: string, resources: readonly ResourceRef[]) => (
    <section
      className="taskbar-search-body__list-pane"
      aria-label={label}
      data-list={label === "추천" ? "recommendations" : "rows"}
    >
      <h2 className="taskbar-search-body__heading">{label}</h2>
      <ul className="taskbar-search-body__list">
        {resources.map((resource) => {
          const index = rowIndex++;
          return (
            <li className="taskbar-search-body__row" key={`${resource.kind}:${resource.id}`}>
              <Button
                type="button"
                className="taskbar-search-body__main"
                aria-disabled={blocked}
                onClick={() => open(resource)}
                ref={(element) => {
                  if (element instanceof HTMLButtonElement) owner.rows.current[index] = element;
                }}
                onKeyDown={owner.onRowKeyDown}
                onFocus={() => owner.onRowFocus(index)}
                onContextMenu={
                  onItemContextMenu
                    ? (event) => {
                        if (!blocked) onItemContextMenu(event, resource);
                      }
                    : undefined
                }
              >
                <TaskbarStartIcon
                  className="taskbar-search-body__icon"
                  resource={resource}
                  resolveIcon={resolveIcon}
                  variant="all"
                />
                <span className="taskbar-search-body__title">{title(resource)}</span>
              </Button>
              <Button
                type="button"
                aria-label={`${title(resource)} 자세히`}
                aria-disabled={blocked}
                className="taskbar-search-body__detail-toggle"
                data-selected={snapshot.detail?.id === resource.id ? "true" : undefined}
                onClick={(event) => {
                  if (blocked) return;
                  owner.detailOpener.current = event.currentTarget;
                  owner.showDetail(resource);
                }}
              >
                <ChevronRight16Regular aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
  const detail = snapshot.detail;
  const searchResults = viewModel.results[panel].map((match) => match.ref);
  return (
    <div
      className="taskbar-search-body"
      data-default={!snapshot.query && !detail ? "true" : undefined}
      data-pending={snapshot.pending ? "true" : undefined}
    >
      <div className="taskbar-search-body__lists">
        {snapshot.query ? (
          list("최고의 일치", searchResults)
        ) : (
          <>
            {list(
              "최근 항목",
              viewModel.recent
                .map((entry) => entry.resource)
                .filter((resource) => title(resource) !== ""),
            )}
            {list("추천", viewModel.recommendations)}
          </>
        )}
        {snapshot.query && searchResults.length === 0 ? <p>검색 결과가 없습니다</p> : null}
      </div>
      {detail ? (
        <section className="taskbar-search-body__detail" aria-label="검색 항목 상세">
          <Button
            type="button"
            aria-label="뒤로"
            className="taskbar-search-body__back"
            onClick={owner.back}
          >
            <ArrowLeft16Regular aria-hidden="true" />
          </Button>
          <div className="taskbar-search-body__detail-summary">
            <TaskbarStartIcon
              className="taskbar-search-body__detail-icon"
              resource={detail}
              resolveIcon={resolveIcon}
              variant="pinned"
            />
            <hr />
            <h3 className="taskbar-search-body__detail-title">{title(detail)}</h3>
            <p className="taskbar-search-body__detail-path">{path(detail)}</p>
          </div>
          <div className="taskbar-search-body__detail-actions">
            <Button type="button" aria-disabled={blocked} onClick={() => open(detail)}>
              <Open16Regular aria-hidden="true" />
              {detail.kind === "content"
                ? "파일 열기"
                : detail.kind === "folder"
                  ? "폴더 열기"
                  : "열기"}
            </Button>
            {detail.kind === "content" ? (
              <Button
                type="button"
                aria-disabled={blocked}
                onClick={() => {
                  if (!blocked) open(detail, true);
                }}
              >
                <FolderOpen16Regular aria-hidden="true" />
                파일 위치 열기
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="taskbar-search-body__empty-detail" />
      )}
    </div>
  );
};
