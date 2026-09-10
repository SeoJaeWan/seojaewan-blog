/**
 * @file Taskbar primary panel의 pure model, command, selector와 in-memory state API를 조합한다.
 *
 * Operation과 React controller를 같은 feature public entry에서 제공한다.
 */
export {
  activatePrimaryPanel,
  completePrimaryPanelClose,
  deactivatePrimaryPanel,
  type PrimaryPanelChange,
  type PrimaryPanelCommandResult,
  updatePrimaryPanelQuery,
} from "./commands/index.js";
export {
  type PrimaryPanelController,
  type PrimaryPanelControllerActions,
  type PrimaryPanelControllerViewModel,
  usePrimaryPanelController,
} from "./controller/index.js";
export {
  createInitialPrimaryPanelSnapshot,
  type PrimaryPanelId,
  type PrimaryPanelSnapshot,
} from "./model/index.js";
export {
  PRIMARY_PANEL_ENTER_PHASE,
  PRIMARY_PANEL_EXIT_PHASE,
  type PrimaryPanelAction,
  type PrimaryPanelCommittedResult,
  type PrimaryPanelDismissReason,
  type PrimaryPanelModeReader,
  type PrimaryPanelOperationHandle,
  PrimaryPanelOperations,
  type PrimaryPanelOperationsOptions,
  type PrimaryPanelPresentedResult,
  type PrimaryPanelResourceOpenRequestId,
  type PrimaryPanelSettledResult,
} from "./operations/index.js";
export {
  type PrimaryPanelTriggerIntent,
  type PrimaryPanelView,
  selectPrimaryPanelTriggerIntent,
  selectPrimaryPanelView,
} from "./selectors/index.js";
export {
  createPrimaryPanelState,
  type PrimaryPanelListener,
  type PrimaryPanelState,
} from "./state/index.js";
