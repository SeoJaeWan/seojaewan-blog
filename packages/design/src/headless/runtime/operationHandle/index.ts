/**
 * @file Operation의 식별자와 committed·presented·settled 대기 계약을 정의한다.
 *
 * 대상별 실행 순서와 transition 완료 신호의 저장은 각각 전용 runtime 요소가 소유한다.
 */

declare const operationIdBrand: unique symbol;

/**
 * 한 Operation과 그 transition 신호를 연결하는 runtime 고유 식별자다.
 *
 * serializable Action에는 넣지 않으며 Action을 실행하기 시작할 때 runtime이 발급한다.
 */
export type OperationId = string & Readonly<{ [operationIdBrand]: true }>;

/**
 * committed, presented와 settled 결과가 구분 가능한 tag를 가진다는 공통 구조다.
 *
 * 구체 `status` 값과 추가 필드는 각 feature가 소유하며 runtime은 제품 결과를 다시 해석하지 않는다.
 */
export type TaggedOperationResult = Readonly<{ status: string }>;

/**
 * Operation 실행 기반이 자체적으로 종료한 대기의 실패 결과다.
 *
 * 제품 거절과 no-op은 feature 결과로 반환하고, executor 예외·누락 phase·cleanup 실패만 이 결과로 표현한다.
 */
export type OperationRuntimeFailure =
  /**
   * Operation executor가 값을 반환하지 못하고 예외로 종료됐다.
   */
  | Readonly<{ status: "failed"; source: "execution"; error: unknown }>
  /**
   * executor가 끝날 때 committed 또는 presented 완료를 명시하지 않았다.
   */
  | Readonly<{
      status: "failed";
      source: "incomplete-phase";
      phase: "committed" | "presented";
    }>
  /**
   * Operation 종료 cleanup 중 하나 이상이 예외를 던졌다.
   */
  | Readonly<{ status: "failed"; source: "cleanup"; errors: readonly unknown[] }>;

/**
 * 호출자가 semantic commit, 표현 완료와 전체 정리를 각각 기다리는 공개 Handle이다.
 *
 * 일반적인 전체 완료는 `settled`를 기다리고, commit 직후 표현을 시작할 consumer만 `committed`를 사용한다.
 */
export type OperationHandle<
  Committed extends TaggedOperationResult,
  Presented extends TaggedOperationResult,
  Settled extends TaggedOperationResult,
> = Readonly<{
  /**
   * transition 완료 신호와 Handle을 연결하는 현재 실행의 식별자다.
   */
  operationId: OperationId;
  /**
   * Store의 semantic commit 또는 feature가 명시한 no-op·거절 결과를 기다린다.
   */
  committed: Promise<Committed | OperationRuntimeFailure>;
  /**
   * 현재 Operation이 소유한 UI transition의 완료·중단·watchdog·실패 결과를 기다린다.
   */
  presented: Promise<Presented | OperationRuntimeFailure>;
  /**
   * semantic 처리, 표현, persistence와 cleanup을 포함한 전체 종료를 기다린다.
   */
  settled: Promise<Settled | OperationRuntimeFailure>;
}>;

/**
 * pending Promise와 중복 완료를 무시하는 resolver를 함께 만든다.
 */
const createDeferredPhase = <Value>() => {
  let completed = false;
  let resolvePromise: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    /**
     * 첫 결과만 phase에 반영하고 이후 중복 신호에는 false를 반환한다.
     */
    resolve: (value: Value): boolean => {
      if (completed) return false;
      completed = true;
      resolvePromise(value);
      return true;
    },
    /**
     * phase가 아직 pending인지 반환한다.
     */
    isPending: (): boolean => !completed,
  };
};

/**
 * runtime queue가 소유할 Handle과 각 phase의 단일 완료 함수를 만든다.
 *
 * feature executor에는 Handle 자체가 아니라 필요한 완료 함수만 제한해 전달한다.
 */
export const createOperationHandle = <
  Committed extends TaggedOperationResult,
  Presented extends TaggedOperationResult,
  Settled extends TaggedOperationResult,
>(
  operationId: OperationId,
) => {
  const committed = createDeferredPhase<Committed | OperationRuntimeFailure>();
  const presented = createDeferredPhase<Presented | OperationRuntimeFailure>();
  const settled = createDeferredPhase<Settled | OperationRuntimeFailure>();

  return {
    handle: Object.freeze({
      operationId,
      committed: committed.promise,
      presented: presented.promise,
      settled: settled.promise,
    }) satisfies OperationHandle<Committed, Presented, Settled>,
    committed,
    presented,
    settled,
  };
};
