/**
 * @file DOM-free Operation Handle, target queue와 transition registry의 public surface를 조합한다.
 *
 * feature별 Action routing, Store command 연결과 React Provider는 후속 feature 구현이 소유한다.
 */
export {
  createOperationHandle,
  type OperationHandle,
  type OperationId,
  type OperationRuntimeFailure,
  type TaggedOperationResult,
} from "./operationHandle/index.js";
export {
  type OperationCleanup,
  type OperationExecutionContext,
  type OperationExecutor,
  OperationTargetQueue,
} from "./operationTargetQueue/index.js";
export {
  DEFAULT_TRANSITION_WATCHDOG_MS,
  type TransitionPhase,
  TransitionRegistry,
  type TransitionResult,
  type TransitionWaitOptions,
} from "./transitionRegistry/index.js";
