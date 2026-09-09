/**
 * @file operation ID와 phase에 해당하는 UI transition 완료·중단·실패·watchdog을 연결한다.
 *
 * DOM event, animation handle, duration Token과 제품 semantic commit은 소유하지 않는다.
 */
import type { OperationId } from "../operationHandle/index.js";

/**
 * UI completion 누락으로 Operation queue가 멈추지 않게 하는 기본 watchdog 시간이다.
 */
export const DEFAULT_TRANSITION_WATCHDOG_MS = 1_000;

/**
 * 하나의 Operation 안에서 Component가 수행하는 transition 단계를 식별하는 문자열이다.
 */
export type TransitionPhase = string;

/**
 * Component 또는 watchdog이 끝낸 transition 대기의 tagged 결과다.
 *
 * `failed`는 UI transition 실행 실패이며 feature의 제품 거절 결과와 구분한다.
 */
export type TransitionResult =
  /**
   * 현재 operation ID와 phase의 transition이 정상 완료됐다.
   */
  | Readonly<{ status: "completed"; operationId: OperationId; phase: TransitionPhase }>
  /**
   * Component가 사라지는 등 transition 대기는 중단됐으며 제품 요청 자체의 취소는 뜻하지 않는다.
   */
  | Readonly<{
      status: "aborted";
      operationId: OperationId;
      phase: TransitionPhase;
      reason: string;
    }>
  /**
   * UI 완료 신호가 제한 시간 안에 오지 않아 대기와 timer를 정리했다.
   */
  | Readonly<{
      status: "watchdog";
      operationId: OperationId;
      phase: TransitionPhase;
      timeoutMs: number;
    }>
  /**
   * Component가 transition 실행 자체의 실패를 보고했다.
   */
  | Readonly<{
      status: "failed";
      operationId: OperationId;
      phase: TransitionPhase;
      error: unknown;
    }>;

/**
 * 새 transition 대기의 watchdog 설정이다.
 */
export type TransitionWaitOptions = Readonly<{
  /**
   * 생략하면 1000ms를 사용하며 0은 다음 timer tick에 watchdog으로 종료한다.
   */
  timeoutMs?: number;
}>;

type Waiter = Readonly<{
  promise: Promise<TransitionResult>;
  settle(result: TransitionResult): boolean;
}>;

/**
 * watchdog 값이 finite한 0 이상 숫자인지 검증해 반환한다.
 */
const parseTimeout = (timeoutMs: number): number => {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError("transition watchdog 시간은 0 이상의 finite 숫자여야 합니다");
  }
  return timeoutMs;
};

/**
 * transition 대기와 operation ID·phase 기반 완료 신호를 메모리에서 연결한다.
 *
 * 첫 종료 신호만 적용하고 timer와 registry 항목을 제거하므로 중복 또는 늦은 신호는 false로 무시한다.
 */
export class TransitionRegistry {
  readonly #operations = new Map<OperationId, Map<TransitionPhase, Waiter>>();

  /**
   * operation ID와 phase의 transition을 등록하고 tagged 완료 결과를 기다린다.
   *
   * 같은 대기가 이미 등록돼 있으면 기존 Promise를 반환해 모든 consumer가 같은 첫 결과로 종료된다.
   */
  waitFor(
    operationId: OperationId,
    phase: TransitionPhase,
    options: TransitionWaitOptions = {},
  ): Promise<TransitionResult> {
    const operation = this.#operations.get(operationId);
    const existing = operation?.get(phase);
    if (existing !== undefined) return existing.promise;

    const timeoutMs = parseTimeout(options.timeoutMs ?? DEFAULT_TRANSITION_WATCHDOG_MS);
    let completed = false;
    let resolvePromise: (result: TransitionResult) => void = () => undefined;
    const promise = new Promise<TransitionResult>((resolve) => {
      resolvePromise = resolve;
    });
    const waiter: Waiter = {
      promise,
      /**
       * 첫 결과를 전달하면서 watchdog과 registry 항목을 함께 정리한다.
       */
      settle: (result): boolean => {
        if (completed) return false;
        completed = true;
        clearTimeout(timer);
        this.#delete(operationId, phase);
        resolvePromise(result);
        return true;
      },
    };

    const phases = operation ?? new Map<TransitionPhase, Waiter>();
    phases.set(phase, waiter);
    if (operation === undefined) this.#operations.set(operationId, phases);
    const timer = setTimeout(() => {
      waiter.settle(Object.freeze({ status: "watchdog", operationId, phase, timeoutMs }));
    }, timeoutMs);
    return promise;
  }

  /**
   * 정확히 일치하는 operation ID와 phase의 정상 완료를 한 번 전달한다.
   */
  complete(operationId: OperationId, phase: TransitionPhase): boolean {
    return this.#settle(operationId, phase, { status: "completed", operationId, phase });
  }

  /**
   * 정확히 일치하는 transition 대기를 중단하고 이유를 보존한다.
   */
  abort(operationId: OperationId, phase: TransitionPhase, reason: string): boolean {
    return this.#settle(operationId, phase, {
      status: "aborted",
      operationId,
      phase,
      reason,
    });
  }

  /**
   * 정확히 일치하는 transition 실행 실패를 제품 거절과 구분해 전달한다.
   */
  fail(operationId: OperationId, phase: TransitionPhase, error: unknown): boolean {
    return this.#settle(operationId, phase, { status: "failed", operationId, phase, error });
  }

  /**
   * 한 Operation에 현재 등록된 모든 phase를 같은 이유로 중단하고 종료한 개수를 반환한다.
   */
  abortOperation(operationId: OperationId, reason: string): number {
    const phases = this.#operations.get(operationId);
    if (phases === undefined) return 0;
    let count = 0;
    for (const phase of [...phases.keys()]) {
      if (this.abort(operationId, phase, reason)) count += 1;
    }
    return count;
  }

  /**
   * 현재 대기 중인 operation ID와 phase에 첫 종료 결과를 전달한다.
   */
  #settle(operationId: OperationId, phase: TransitionPhase, result: TransitionResult): boolean {
    return this.#operations.get(operationId)?.get(phase)?.settle(Object.freeze(result)) ?? false;
  }

  /**
   * 종료된 phase를 제거하고 해당 Operation의 마지막 phase였다면 상위 항목도 제거한다.
   */
  #delete(operationId: OperationId, phase: TransitionPhase): void {
    const phases = this.#operations.get(operationId);
    if (phases === undefined) return;
    phases.delete(phase);
    if (phases.size === 0) this.#operations.delete(operationId);
  }
}
