/**
 * @file Taskbar primary panel의 pure model, command, selector와 in-memory state API를 조합한다.
 *
 * Operation, React controller와 제품 Component API는 후속 요소가 이 entry에 연결한다.
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
  createInitialPrimaryPanelSnapshot,
  type PrimaryPanelId,
  type PrimaryPanelSnapshot,
} from "./model/index.js";
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
