/**
 * @file Search 후보, 최신 추천과 적용 query 결과를 현재 typed reader에서 파생한다.
 *
 * 검색 알고리즘과 Resource 원본은 resources가, 저장과 UI 탐색은 인접 경계가 소유한다.
 */
import {
  type ContentResourceRef,
  type ResourceReaders,
  type ResourceRef,
  type ResourceSearchMatch,
  searchResources,
} from "../../../resources/index.js";
import type { PrimaryPanelId } from "../../primaryPanel/index.js";
import type { TaskbarSearchSnapshot } from "../model/index.js";

/**
 * 현재 Workspace Folder와 정적 Catalog의 후보 ref를 반환한다.
 *
 * 원본과 placement를 변경하지 않으며 전체 결과 개수를 제한하지 않는다.
 */
export const selectSearchCandidates = (readers: ResourceReaders): readonly ResourceRef[] =>
  Object.freeze([
    ...readers.content.list().map((entry) => entry.ref),
    ...readers.folder.list().map((entry) => entry.ref),
    ...readers.externalShortcut.list().map((entry) => entry.ref),
  ]);

/**
 * Content date 내림차순과 id tie-break로 최신 최대 여섯 개를 추천한다.
 *
 * frequent, editorial category와 Workspace parent는 순서에 관여하지 않는다.
 */
export const selectSearchRecommendations = (
  readers: ResourceReaders,
): readonly ContentResourceRef[] =>
  Object.freeze(
    [...readers.content.list()]
      .sort((left, right) =>
        left.date === right.date
          ? left.ref.id < right.ref.id
            ? -1
            : left.ref.id > right.ref.id
              ? 1
              : 0
          : left.date > right.date
            ? -1
            : 1,
      )
      .slice(0, 6)
      .map((entry) => entry.ref),
  );

/**
 * 적용 query로 공통 pure 검색을 호출하고 전체 일치 결과를 반환한다.
 *
 * pending 동안에도 이전 적용 query 결과를 유지하며 실행 차단은 제품 Action이 담당한다.
 */
export const selectTaskbarSearchResults = (
  snapshot: TaskbarSearchSnapshot,
  panel: PrimaryPanelId,
  readers: ResourceReaders,
): readonly ResourceSearchMatch[] =>
  searchResources({
    query: snapshot.panels[panel].query,
    candidates: selectSearchCandidates(readers),
    readers,
  });
