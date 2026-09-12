/**
 * @file runtime-local Search transient와 공유 recent의 복원·commit·저장을 소유한다.
 *
 * browser 전역은 읽지 않으며 raw query·timer·IME와 실제 Resource open은 소유하지 않는다.
 */
import {
  normalizeResourceSearchQuery,
  parseResourceRef,
  type ResourceRef,
} from "../../../resources/index.js";
import type { PrimaryPanelId } from "../../primaryPanel/index.js";
import type {
  SearchAction,
  SearchPanelSnapshot,
  SearchRecentEntry,
  SearchRecentStorage,
  SearchRecentStorageSnapshot,
  SearchResourceReader,
  TaskbarSearchResult,
  TaskbarSearchSnapshot,
} from "../model/index.js";
import { selectSearchRecommendations, selectTaskbarSearchResults } from "../selectors/index.js";

/**
 * Search Store의 준비 reader, 선택적 저장 port와 완료 시각 clock이다.
 *
 * Application은 Catalog·Workspace 준비 후 initialize를 호출한다.
 */
export type TaskbarSearchStoreOptions = Readonly<{
  resources: SearchResourceReader;
  storage?: SearchRecentStorage;
  clock?: Readonly<{ now(): number }>;
}>;

/**
 * 입력 revision을 보존하면서 빈 적용 상태를 만든다.
 */
const emptyPanel = (version = 0): SearchPanelSnapshot =>
  Object.freeze({ query: "", version, pending: false, detail: null });

/**
 * ref 종류와 id가 모두 같을 때만 같은 recent identity로 판정한다.
 */
const sameRef = (left: ResourceRef, right: ResourceRef): boolean =>
  left.kind === right.kind && left.id === right.id;

/**
 * 저장 항목의 identity·시각을 검사하고 중복 없이 최신 순서 최대 스무 개를 복원한다.
 */
const parseRecent = (value: unknown): readonly SearchRecentEntry[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("recent" in value) ||
    !Array.isArray(value.recent)
  )
    return Object.freeze([]);
  const entries: SearchRecentEntry[] = [];
  const values: readonly unknown[] = value.recent;
  for (const entry of values) {
    try {
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("openedAt" in entry) ||
        !("resource" in entry) ||
        typeof entry.openedAt !== "number" ||
        !Number.isFinite(entry.openedAt)
      )
        continue;
      entries.push(
        Object.freeze({ resource: parseResourceRef(entry.resource), openedAt: entry.openedAt }),
      );
    } catch {
      /* 읽을 수 없는 항목만 제거하고 다른 유효 항목을 보존한다. */
    }
  }
  return normalizeRecent(entries);
};

/**
 * 완료 시각 내림차순의 항목을 안정적으로 dedupe하고 개수 제한을 적용한다.
 */
const normalizeRecent = (entries: readonly SearchRecentEntry[]): readonly SearchRecentEntry[] => {
  const recent: SearchRecentEntry[] = [];
  for (const entry of [...entries].sort((left, right) => right.openedAt - left.openedAt)) {
    if (!recent.some((current) => sameRef(current.resource, entry.resource))) recent.push(entry);
    if (recent.length === 20) break;
  }
  return Object.freeze(recent);
};

/**
 * changed 여부와 persistence 결과를 immutable하게 반환한다.
 */
const resultOf = (
  changed: boolean,
  persistence: TaskbarSearchResult["persistence"] = "not-required",
): TaskbarSearchResult => Object.freeze({ changed, persistence });

/**
 * Start와 Taskbar의 적용 query를 분리하고 성공 open recent를 함께 보존하는 Store다.
 *
 * import·생성만으로 Catalog, 저장소나 browser singleton을 읽거나 초기화하지 않는다.
 */
export class TaskbarSearchStore {
  readonly #resources: SearchResourceReader;
  readonly #storage: SearchRecentStorage | undefined;
  readonly #clock: Readonly<{ now(): number }>;
  readonly #listeners = new Set<() => void>();
  #snapshot: TaskbarSearchSnapshot = Object.freeze({
    panels: Object.freeze({ start: emptyPanel(), search: emptyPanel() }),
    recent: Object.freeze([]),
  });
  #tail: Promise<unknown> = Promise.resolve();
  #initialized = false;
  #initialization: Promise<boolean> | undefined;

  /**
   * reader와 port만 보관하고 실제 복원은 명시적 initialize까지 미룬다.
   */
  constructor(options: TaskbarSearchStoreOptions) {
    this.#resources = options.resources;
    this.#storage = options.storage;
    this.#clock = options.clock ?? { now: () => Date.now() };
  }

  /**
   * 현재 immutable snapshot을 반환하며 준비 전에도 세션 transient는 읽을 수 있다.
   */
  getSnapshot = (): TaskbarSearchSnapshot => this.#snapshot;

  /**
   * commit만 구독하며 저장 완료와 UI 수명은 구독에 연결하지 않는다.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * 준비된 Catalog·Workspace에서만 한 번 복원·reconcile하고 정리된 snapshot을 저장한다.
   */
  initialize(): Promise<boolean> {
    if (this.#initialization !== undefined) return this.#initialization;
    if (this.#resources.getReaders() === null) return Promise.resolve(false);
    this.#initialization = this.#enqueue(async () => {
      let loaded: unknown;
      try {
        loaded = await this.#storage?.load();
      } catch {
        loaded = null;
      }
      // load 중 발생한 세션 기록도 복원 결과와 함께 보존한다.
      const merged: SearchRecentEntry[] = [];
      for (const entry of [...this.#snapshot.recent, ...parseRecent(loaded)]) {
        if (!merged.some((current) => sameRef(current.resource, entry.resource)))
          merged.push(entry);
      }
      const recent = this.#validRecent(Object.freeze(merged.slice(0, 20)));
      this.#commit({ ...this.#snapshot, recent });
      this.#initialized = true;
      await this.#save();
      return true;
    });
    return this.#initialization;
  }

  /**
   * raw 변경 즉시 detail을 비우고 이전 결과를 유지하며 빈 정규화 입력은 즉시 기본 화면으로 바꾼다.
   */
  invalidateQuery(panel: PrimaryPanelId, rawQuery: string): void {
    const current = this.#snapshot.panels[panel];
    const empty = normalizeResourceSearchQuery(rawQuery) === "";
    this.#setPanel(panel, {
      ...current,
      query: empty ? "" : current.query,
      version: current.version + 1,
      pending: !empty,
      detail: null,
    });
  }

  /**
   * close 완료의 해당 panel transient만 폐기하며 shared recent는 보존한다.
   */
  reset(panel: PrimaryPanelId): void {
    this.#setPanel(panel, emptyPanel(this.#snapshot.panels[panel].version + 1));
  }

  /**
   * 적용 query·detail Action은 즉시 처리하고 recent reconcile만 저장 queue에 넣는다.
   */
  execute(action: SearchAction): TaskbarSearchResult | Promise<TaskbarSearchResult> {
    if (action.type === "search.reconcile")
      return this.#enqueue(async () => {
        if (this.#resources.getReaders() === null) return resultOf(false);
        const recent = this.#validRecent(this.#snapshot.recent);
        if (recent.length === this.#snapshot.recent.length) return resultOf(false);
        this.#commit({ ...this.#snapshot, recent });
        return resultOf(true, await this.#save());
      });
    const current = this.#snapshot.panels[action.panel];
    if (action.type === "search.apply-query") {
      if (action.version !== current.version) return resultOf(false);
      this.#setPanel(action.panel, {
        ...current,
        query: normalizeResourceSearchQuery(action.query),
        pending: false,
        detail: null,
      });
      return resultOf(true);
    }
    if (action.type === "search.hide-detail") {
      if (current.detail === null) return resultOf(false);
      this.#setPanel(action.panel, { ...current, detail: null });
      return resultOf(true);
    }
    const readers = this.#resources.getReaders();
    if (current.pending || readers === null) return resultOf(false);
    const visible =
      current.query === ""
        ? [
            ...this.#validRecent(this.#snapshot.recent).map((entry) => entry.resource),
            ...selectSearchRecommendations(readers),
          ]
        : selectTaskbarSearchResults(this.#snapshot, action.panel, readers).map(
            (match) => match.ref,
          );
    if (!visible.some((ref) => sameRef(ref, action.resource))) return resultOf(false);
    this.#setPanel(action.panel, { ...current, detail: Object.freeze({ ...action.resource }) });
    return resultOf(true);
  }

  /**
   * 성공한 실제 열린 ref를 즉시 맨 위에 기록하고 저장 실패와 무관하게 세션을 유지한다.
   */
  recordOpened(resource: ResourceRef): Promise<TaskbarSearchResult> {
    const entry = Object.freeze({
      resource: parseResourceRef(resource),
      openedAt: this.#clock.now(),
    });
    this.#commit({
      ...this.#snapshot,
      recent: Object.freeze(
        [
          entry,
          ...this.#snapshot.recent.filter((current) => !sameRef(current.resource, resource)),
        ].slice(0, 20),
      ),
    });
    return this.#enqueue(async () => resultOf(true, await this.#save()));
  }

  /**
   * 현재 Catalog에 없는 ref만 제거하며 준비 전에는 유효 여부를 추측하지 않는다.
   */
  #validRecent(recent: readonly SearchRecentEntry[]): readonly SearchRecentEntry[] {
    const readers = this.#resources.getReaders();
    return readers === null
      ? recent
      : Object.freeze(
          recent.filter((entry) => {
            const reader =
              entry.resource.kind === "content"
                ? readers.content
                : entry.resource.kind === "folder"
                  ? readers.folder
                  : readers.externalShortcut;
            return reader.has(entry.resource.id);
          }),
        );
  }

  /**
   * panel 객체만 교체하고 다른 진입점 및 공유 recent identity를 유지한다.
   */
  #setPanel(panel: PrimaryPanelId, value: SearchPanelSnapshot): void {
    this.#commit({
      ...this.#snapshot,
      panels: Object.freeze({ ...this.#snapshot.panels, [panel]: Object.freeze(value) }),
    });
  }

  /**
   * 메모리 snapshot을 먼저 교체하고 저장 완료 전에 구독자에게 commit을 알린다.
   */
  #commit(snapshot: TaskbarSearchSnapshot): void {
    this.#snapshot = Object.freeze(snapshot);
    for (const listener of this.#listeners) listener();
  }

  /**
   * 준비 후 현재 versioned recent만 저장하고 rejection을 정상 persistence 결과로 분류한다.
   */
  async #save(): Promise<TaskbarSearchResult["persistence"]> {
    if (!this.#initialized || this.#storage === undefined) return "not-required";
    const snapshot: SearchRecentStorageSnapshot = Object.freeze({
      schemaVersion: 1,
      recent: this.#snapshot.recent,
    });
    try {
      await this.#storage.save(snapshot);
      return "saved";
    } catch {
      return "failed";
    }
  }

  /**
   * 저장·복원 queue의 rejection이 다음 작업을 막지 않게 하면서 caller 결과를 보존한다.
   */
  #enqueue<Value>(operation: () => Promise<Value>): Promise<Value> {
    const pending = this.#tail.then(operation);
    this.#tail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }
}
