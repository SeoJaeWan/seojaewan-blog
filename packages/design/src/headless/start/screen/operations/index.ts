/**
 * @file serializable Start screen Action을 transient state 명령으로 연결한다.
 *
 * primary panel close, mobile 판정, Pin persistence와 UI 표현은 호출자가 소유한다.
 */
import type { StartScreenChange } from "../commands/index.js";
import type { StartScreenSnapshot, StartScreenView } from "../model/index.js";
import { createStartScreenState, type StartScreenState } from "../state/index.js";

/** panel lifecycle이 Start browse state를 초기화하는 명시적 원인이다. */
export type StartScreenResetReason = "close-complete" | "mobile";

/** Start screen 제품 경계와 panel lifecycle이 실행할 수 있는 serializable Action이다. */
export type StartScreenAction =
  | Readonly<{ type: "set-view"; view: StartScreenView }>
  | Readonly<{ type: "set-index-open"; open: boolean }>
  | Readonly<{ type: "reset"; reason: StartScreenResetReason }>;

/** Action과 명령 결과를 함께 보존하는 immutable Start screen 실행 결과다. */
export type StartScreenOperationResult =
  | Readonly<{
      status: "changed";
      action: StartScreenAction;
      snapshot: StartScreenSnapshot;
      change: StartScreenChange;
    }>
  | Readonly<{
      status: "no-op";
      action: StartScreenAction;
      snapshot: StartScreenSnapshot;
      change: null;
    }>;

/** Start screen Operation에 주입할 transient state dependency다. */
export type StartScreenOperationsOptions = Readonly<{
  state?: StartScreenState;
}>;

/**
 * Action을 하나의 synchronous state 명령으로 실행한다.
 *
 * 별도 Start Pin Store dependency가 없어 reset Action은 transient state만 변경할 수 있다.
 */
export class StartScreenOperations {
  readonly #state: StartScreenState;

  /** 주입된 state 또는 새 독립 in-memory state를 보관한다. */
  constructor(options: StartScreenOperationsOptions = {}) {
    this.#state = options.state ?? createStartScreenState();
  }

  /** 현재 immutable Start screen snapshot을 반환한다. */
  getSnapshot(): StartScreenSnapshot {
    return this.#state.getSnapshot();
  }

  /** semantic state commit을 구독하고 해당 listener의 해제 함수를 반환한다. */
  subscribe(listener: () => void): () => void {
    return this.#state.subscribe(listener);
  }

  /** serializable Action을 해당 atomic command로 보내 immutable 결과를 반환한다. */
  execute(action: StartScreenAction): StartScreenOperationResult {
    const result =
      action.type === "set-view"
        ? this.#state.setView(action.view)
        : action.type === "set-index-open"
          ? this.#state.setIndexOpen(action.open)
          : this.#state.reset();

    return Object.freeze({ ...result, action: Object.freeze({ ...action }) });
  }
}
