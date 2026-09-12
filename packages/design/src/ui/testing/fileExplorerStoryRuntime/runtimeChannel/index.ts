import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
} from "../../../../headless/runtime/index.js";

type RecordedAction = Readonly<{ owner: string; action: Readonly<{ type?: unknown }> }>;

/**
 * Story browser assertion이 owner별 Action 기록을 관찰하는 외부 store다.
 */
export type FileExplorerStoryActionRecorder = Readonly<{
  record(owner: string, action: unknown): void;
  connect(output: HTMLOutputElement): () => void;
}>;

/**
 * Story Action 목록을 기록하고 연결된 output DOM을 동기화한다.
 */
export const createFileExplorerStoryActionRecorder = (): FileExplorerStoryActionRecorder => {
  let actions: readonly RecordedAction[] = Object.freeze([]);
  const outputs = new Set<HTMLOutputElement>();
  const value = () => JSON.stringify(actions);
  return Object.freeze({
    record(owner: string, action: unknown) {
      actions = Object.freeze([
        ...actions,
        Object.freeze({ owner, action: action as Readonly<{ type?: unknown }> }),
      ]);
      for (const output of outputs) output.textContent = value();
    },
    connect(output: HTMLOutputElement) {
      outputs.add(output);
      output.textContent = value();
      return () => {
        outputs.delete(output);
      };
    },
  });
};

const operationHandle = Object.freeze({
  operationId: "file-explorer-story-operation",
  committed: Promise.resolve(Object.freeze({ status: "no-op" })),
  presented: Promise.resolve(Object.freeze({ status: "not-required" })),
  settled: Promise.resolve(Object.freeze({ status: "settled" })),
});

/**
 * Immutable snapshot reducer를 Story용 HeadlessFeatureRuntime 채널로 감싼다.
 */
export const createFileExplorerStoryChannel = <Snapshot>(
  initialSnapshot: Snapshot,
  owner: string,
  recorder: FileExplorerStoryActionRecorder,
  reduce?: (snapshot: Snapshot, action: unknown) => Snapshot,
) => {
  let snapshot = initialSnapshot;
  let ready: ControllerViewModel<Snapshot> = Object.freeze({ status: "ready", snapshot });
  const listeners = new Set<() => void>();
  return Object.freeze({
    getSnapshot: () => ready,
    getServerSnapshot: () => ready,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute: (action: unknown) => {
      recorder.record(owner, action);
      const next = reduce?.(snapshot, action) ?? snapshot;
      if (next !== snapshot) {
        snapshot = next;
        ready = Object.freeze({ status: "ready", snapshot });
        for (const listener of listeners) listener();
      }
      return operationHandle;
    },
  }) as unknown as HeadlessFeatureRuntime<Snapshot, never, never>;
};
