/**
 * @file Operation을 target별로 settled까지 직렬화하고 서로 다른 target은 독립 실행한다.
 *
 * feature의 semantic 상태 계산, Store commit, persistence와 transition 실행 순서는 구현하지 않는다.
 */
import {
  createOperationHandle,
  type OperationHandle,
  type OperationId,
  type OperationRuntimeFailure,
  type TaggedOperationResult,
} from "../operationHandle/index.js";

/**
 * Operation 종료 시 실행할 listener·timer·registry 정리 함수다.
 */
export type OperationCleanup = () => void;

/**
 * feature executor가 Handle phase와 생성 뒤 target 연결을 완료하는 내부 실행 계약이다.
 *
 * `attachTarget`은 ID가 commit 뒤 생기는 Window 생성 Operation에 사용하며, 연결 성공 뒤 같은 target 요청은 현재 Operation의 settled를 기다린다.
 */
export type OperationExecutionContext<
  Target,
  Committed extends TaggedOperationResult,
  Presented extends TaggedOperationResult,
> = Readonly<{
  /**
   * 현재 executor와 transition 신호를 연결하는 식별자다.
   */
  operationId: OperationId;
  /**
   * semantic commit, no-op 또는 제품 거절의 첫 결과를 committed Handle에 전달한다.
   */
  completeCommitted(result: Committed): boolean;
  /**
   * UI transition 완료·중단·watchdog·실패 또는 전환 없음의 첫 결과를 presented Handle에 전달한다.
   */
  completePresented(result: Presented): boolean;
  /**
   * commit 뒤 만들어진 target을 현재 Operation tail에 연결하며 충돌 시 false를 반환한다.
   */
  attachTarget(target: Target): boolean;
  /**
   * 성공과 실패 모두에서 settled 직전에 한 번 실행할 정리를 등록하고 등록 해제 함수를 반환한다.
   */
  onCleanup(cleanup: OperationCleanup): () => void;
}>;

/**
 * 하나의 Operation이 phase를 완료하고 최종 settled 값을 만드는 feature executor다.
 */
export type OperationExecutor<
  Target,
  Committed extends TaggedOperationResult,
  Presented extends TaggedOperationResult,
  Settled extends TaggedOperationResult,
> = (context: OperationExecutionContext<Target, Committed, Presented>) => Promise<Settled>;

let queueSequence = 0;

/**
 * 새 queue 인스턴스의 module 내 고유 prefix를 발급한다.
 */
const createQueuePrefix = (): string => `queue-${(queueSequence += 1)}`;

/**
 * executor 예외를 모든 미완료 대기에 전달할 immutable 실패 결과로 만든다.
 */
const createExecutionFailure = (error: unknown): OperationRuntimeFailure =>
  Object.freeze({ status: "failed", source: "execution", error });

/**
 * executor가 명시적으로 끝내지 않은 Handle phase의 실패 결과를 만든다.
 */
const createIncompletePhaseFailure = (phase: "committed" | "presented"): OperationRuntimeFailure =>
  Object.freeze({ status: "failed", source: "incomplete-phase", phase });

/**
 * cleanup 예외를 원래 Operation 결과와 구분한 immutable 실패 결과로 만든다.
 */
const createCleanupFailure = (errors: readonly unknown[]): OperationRuntimeFailure =>
  Object.freeze({ status: "failed", source: "cleanup", errors: Object.freeze([...errors]) });

/**
 * target별 Promise tail을 관리하는 DOM-free Operation queue다.
 *
 * 같은 target은 앞 Operation의 cleanup과 settled 완료 뒤 실행하고 executor 실패도 정상화해 다음 요청을 계속 실행한다.
 */
export class OperationTargetQueue<Target> {
  readonly #prefix = createQueuePrefix();
  readonly #tails = new Map<Target, Promise<void>>();
  #operationSequence = 0;

  /**
   * 주어진 target 뒤에 Operation을 예약하고 세 완료 시점의 Handle을 즉시 반환한다.
   */
  enqueue<
    Committed extends TaggedOperationResult,
    Presented extends TaggedOperationResult,
    Settled extends TaggedOperationResult,
  >(
    target: Target,
    executor: OperationExecutor<Target, Committed, Presented, Settled>,
  ): OperationHandle<Committed, Presented, Settled> {
    const previous = this.#tails.get(target) ?? Promise.resolve();
    return this.#schedule(previous, [target], executor);
  }

  /**
   * 아직 target ID가 없는 Operation을 즉시 예약하고 executor에서 생성된 target을 연결하게 한다.
   *
   * 연결하려는 target에 다른 Operation tail이 있으면 false를 반환하며 기존 실행 순서를 바꾸지 않는다.
   */
  reserve<
    Committed extends TaggedOperationResult,
    Presented extends TaggedOperationResult,
    Settled extends TaggedOperationResult,
  >(
    executor: OperationExecutor<Target, Committed, Presented, Settled>,
  ): OperationHandle<Committed, Presented, Settled> {
    return this.#schedule(Promise.resolve(), [], executor);
  }

  /**
   * queue 안에서 겹치지 않는 operation ID를 발급한다.
   */
  #createOperationId(): OperationId {
    this.#operationSequence += 1;
    return `${this.#prefix}-operation-${this.#operationSequence}` as OperationId;
  }

  /**
   * 이전 tail 뒤에서 executor를 실행하고 phase 종료, cleanup, tail 복구를 한 번만 수행한다.
   */
  #schedule<
    Committed extends TaggedOperationResult,
    Presented extends TaggedOperationResult,
    Settled extends TaggedOperationResult,
  >(
    previous: Promise<void>,
    initialTargets: readonly Target[],
    executor: OperationExecutor<Target, Committed, Presented, Settled>,
  ): OperationHandle<Committed, Presented, Settled> {
    const operationId = this.#createOperationId();
    const phases = createOperationHandle<Committed, Presented, Settled>(operationId);
    const attachedTargets = new Set<Target>(initialTargets);
    const cleanups = new Set<OperationCleanup>();
    let releaseSlot: () => void = () => undefined;
    const slot = new Promise<void>((resolve) => {
      releaseSlot = resolve;
    });
    const tail = previous.then(() => slot);

    /**
     * target을 현재 Operation tail에 연결하며 이미 다른 tail이 있으면 연결을 거절한다.
     */
    const attachTarget = (target: Target): boolean => {
      if (attachedTargets.has(target)) return true;
      if (this.#tails.has(target)) return false;
      attachedTargets.add(target);
      this.#tails.set(target, tail);
      return true;
    };

    for (const target of initialTargets) this.#tails.set(target, tail);

    void previous.then(async () => {
      let settledResult: Settled | OperationRuntimeFailure;
      let executionFailure: OperationRuntimeFailure | undefined;
      try {
        settledResult = await executor(
          Object.freeze({
            operationId,
            completeCommitted: phases.committed.resolve,
            completePresented: phases.presented.resolve,
            attachTarget,
            onCleanup(cleanup: OperationCleanup): () => void {
              cleanups.add(cleanup);
              return () => cleanups.delete(cleanup);
            },
          }),
        );
      } catch (error) {
        executionFailure = createExecutionFailure(error);
        settledResult = executionFailure;
      }

      let incompleteFailure: OperationRuntimeFailure | undefined;
      if (phases.committed.isPending()) {
        const failure = executionFailure ?? createIncompletePhaseFailure("committed");
        phases.committed.resolve(failure);
        incompleteFailure ??= failure;
      }
      if (phases.presented.isPending()) {
        const failure = executionFailure ?? createIncompletePhaseFailure("presented");
        phases.presented.resolve(failure);
        incompleteFailure ??= failure;
      }
      if (executionFailure === undefined && incompleteFailure !== undefined) {
        settledResult = incompleteFailure;
      }

      const cleanupErrors: unknown[] = [];
      for (const cleanup of [...cleanups].reverse()) {
        try {
          cleanup();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (cleanupErrors.length > 0) settledResult = createCleanupFailure(cleanupErrors);

      phases.settled.resolve(settledResult);
      releaseSlot();
      for (const target of attachedTargets) {
        if (this.#tails.get(target) === tail) this.#tails.delete(target);
      }
    });

    return phases.handle;
  }
}
