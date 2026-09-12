/**
 * @file Search Store 구독과 runtime Action을 React 제품 root에 전달한다.
 *
 * timer·IME·active row·scroll·focus와 raw 입력은 제품 Component가 소유한다.
 */
import { useMemo, useSyncExternalStore } from "react";

import type { ContentResourceRef, ResourceSearchMatch } from "../../../resources/index.js";
import type { HeadlessTaskbarSearchRuntime } from "../../../runtime/index.js";
import { useHeadlessRuntime } from "../../../runtime/index.js";
import type { TaskbarSearchSnapshot } from "../model/index.js";
import { selectSearchRecommendations, selectTaskbarSearchResults } from "../selectors/index.js";

/**
 * Search snapshot과 현재 Workspace에서 파생한 결과·추천의 읽기 모델이다.
 *
 * 원본 metadata와 raw 입력을 복제하지 않고 준비 전에는 결과를 비운다.
 */
export type TaskbarSearchControllerViewModel = TaskbarSearchSnapshot &
  Readonly<{
    ready: boolean;
    results: Readonly<Record<"start" | "search", readonly ResourceSearchMatch[]>>;
    recommendations: readonly ContentResourceRef[];
  }>;

/**
 * 현재 적용 query·detail·recent와 안정적인 제품 Action gateway다.
 *
 * raw query는 usePrimaryPanelController를 함께 사용해 읽고 변경한다.
 */
export type TaskbarSearchController = Readonly<{
  viewModel: TaskbarSearchControllerViewModel;
  actions: Readonly<{ execute: HeadlessTaskbarSearchRuntime["execute"] }>;
}>;

/**
 * SSR에서 빈 transient를 읽고 browser runtime Search snapshot을 구독한다.
 *
 * 구독 해제와 unmount는 진행 중 실제 open 또는 recent 기록을 취소하지 않는다.
 */
export const useTaskbarSearchController = (): TaskbarSearchController => {
  const runtime = useHeadlessRuntime();
  const snapshot = useSyncExternalStore(
    runtime.search.subscribe,
    runtime.search.getSnapshot,
    runtime.search.getServerSnapshot,
  );
  const workspace = useSyncExternalStore(
    runtime.workspace.subscribe,
    runtime.workspace.getSnapshot,
    runtime.workspace.getServerSnapshot,
  );
  const viewModel = useMemo<TaskbarSearchControllerViewModel>(() => {
    // SSR은 준비 전 Workspace를 사용하며 browser singleton reader를 읽지 않는다.
    const readers = workspace.status === "ready" ? runtime.search.getReaders() : null;
    return Object.freeze({
      ...snapshot,
      ready: readers !== null,
      results: Object.freeze({
        start:
          readers === null
            ? Object.freeze([])
            : selectTaskbarSearchResults(snapshot, "start", readers),
        search:
          readers === null
            ? Object.freeze([])
            : selectTaskbarSearchResults(snapshot, "search", readers),
      }),
      recommendations: readers === null ? Object.freeze([]) : selectSearchRecommendations(readers),
    });
  }, [runtime, snapshot, workspace]);
  const actions = useMemo(() => Object.freeze({ execute: runtime.search.execute }), [runtime]);
  return useMemo(() => Object.freeze({ viewModel, actions }), [viewModel, actions]);
};
