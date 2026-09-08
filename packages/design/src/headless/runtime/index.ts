/**
 * @file DOM-free Operation Handle, target queue와 transition registry의 public surface를 조합한다.
 *
 * feature별 Store command 연결은 해당 feature가, React Context 연결은 provider 요소가 소유한다.
 */
export {
  type ControllerViewModel,
  createHeadlessRuntime,
  type ExternalStoreReader,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  type HeadlessRuntimeAdapters,
  type HeadlessRuntimeOptions,
} from "./headlessRuntime/index.js";
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
  HeadlessRuntimeProvider,
  type HeadlessRuntimeProviderProps,
  useHeadlessRuntime,
} from "./provider/index.js";
export {
  DEFAULT_TRANSITION_WATCHDOG_MS,
  type TransitionPhase,
  TransitionRegistry,
  type TransitionResult,
  type TransitionWaitOptions,
} from "./transitionRegistry/index.js";
