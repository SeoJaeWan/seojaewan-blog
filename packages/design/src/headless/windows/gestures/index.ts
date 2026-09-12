/**
 * @file Window move·resize gesture의 시작 frame, update 순서와 Esc rollback을 관리한다.
 *
 * Pointer capture, 좌표 sampling과 DOM event 종료는 Product Component가 소유한다.
 */
import { getWindowBounds } from "../geometry/index.js";
import type { WindowFrameState, WindowRect, WindowState } from "../model/index.js";
import type { WindowSessionId } from "../windowSessionId/index.js";
import { WindowStore } from "../windowStore/index.js";
import type { WindowStoreResult } from "../windowStore/operationResult/index.js";

/**
 * Product Component가 시작할 수 있는 즉시 반영 Window gesture 종류다.
 *
 * resize 방향에 따른 bounds 계산은 `resizeWindowBounds`가 담당한다.
 */
export type WindowGestureKind = "move" | "resize";

/** Window gesture를 시작할 Session과 조작 종류다. */
export type WindowGestureRequest = Readonly<{
  sessionId: WindowSessionId;
  kind: WindowGestureKind;
}>;

/** Window gesture가 사용하는 Store의 DOM-free 최소 명령 surface다. */
export type WindowGestureStore = Readonly<{
  /** 현재 authoritative Window snapshot을 반환한다. */
  getSnapshot(): WindowState;
  /** 계산된 위치·크기와 필요한 normal placement 복원을 한 commit으로 반영한다. */
  applyGestureBounds(
    sessionId: WindowSessionId,
    bounds: WindowRect,
    kind: WindowGestureKind,
  ): Promise<WindowStoreResult>;
  /** Esc 취소 시 시작 frame을 한 commit으로 복구한다. */
  restoreFrame(sessionId: WindowSessionId, frame: WindowFrameState): Promise<WindowStoreResult>;
}>;

/** gesture가 활성 상태에서 받은 bounds를 Store에 전달한 결과다. */
export type WindowGestureUpdateResult =
  /** 해당 update가 Store queue에 들어가 commit·no-op·거절 중 하나로 끝났다. */
  | Readonly<{ status: "applied"; storeResult: WindowStoreResult }>
  /** gesture 종료 또는 취소 뒤 도착한 update라 Store를 호출하지 않았다. */
  | Readonly<{ status: "inactive" }>;

/** gesture의 일반 종료가 이전에 접수된 update까지 비운 결과다. */
export type WindowGestureFinishResult =
  /** 종료 호출 전에 접수된 update가 모두 끝났고 이후 update가 차단됐다. */
  | Readonly<{ status: "finished" }>
  /** 이미 종료 또는 취소된 gesture에 다시 종료를 요청했다. */
  | Readonly<{ status: "inactive" }>;

/** gesture의 Esc 취소가 시작 frame 복구를 시도한 결과다. */
export type WindowGestureCancelResult =
  /** 접수된 update 뒤 시작 frame 복구 명령이 끝났다. */
  | Readonly<{ status: "cancelled"; storeResult: WindowStoreResult }>
  /** 이미 종료 또는 취소된 gesture라 복구 명령을 중복 실행하지 않았다. */
  | Readonly<{ status: "inactive" }>;

/**
 * 한 move·resize gesture의 시작 snapshot과 수명주기 명령이다.
 *
 * `finish` 또는 `cancel`을 호출하면 이후 `update`는 `inactive`이며, Esc 복구는 animation 대기 중단과 별개다.
 */
export type WindowGestureHandle = Readonly<{
  sessionId: WindowSessionId;
  kind: WindowGestureKind;
  /** gesture 시작 당시 실제 표시 bounds다. maximized 상태에서는 당시 workArea와 같다. */
  startBounds: WindowRect;
  /** Esc가 복구할 시작 시점의 normalBounds·placement·minimized 값이다. */
  startFrame: WindowFrameState;
  /** UI가 계산한 숫자 bounds를 접수 순서대로 원자 반영한다. */
  update(bounds: WindowRect): Promise<WindowGestureUpdateResult>;
  /** rollback 없이 gesture를 종료하고 이미 접수된 update 완료를 기다린다. */
  finish(): Promise<WindowGestureFinishResult>;
  /** 이미 접수된 update 뒤 시작 frame을 복구하고 gesture를 종료한다. */
  cancel(): Promise<WindowGestureCancelResult>;
}>;

/** Window gesture 시작 성공과 현재 상태에 따른 명시적 거절을 구분한다. */
export type WindowGestureStartResult =
  /** 시작 frame을 잡고 update를 받을 Handle을 만들었다. */
  | Readonly<{ status: "started"; handle: WindowGestureHandle }>
  /** 대상이 없거나 현재 mode·placement에서 요청한 gesture를 시작할 수 없다. */
  | Readonly<{
      status: "rejected";
      reason:
        | "session-not-found"
        | "mobile-mode"
        | "minimized"
        | "maximized-resize"
        | "invalid-kind";
    }>;

/** Promise 성공·실패와 무관하게 다음 gesture 단계가 이어지도록 tail을 정리한다. */
const settledTail = (promise: Promise<unknown>): Promise<void> =>
  promise.then(
    () => undefined,
    () => undefined,
  );

/**
 * WindowStore의 authoritative frame을 기준으로 DOM-free gesture Handle을 만든다.
 *
 * 같은 Session의 Operation queue를 대체하지 않으며 pointer update에는 transition 대기를 만들지 않는다.
 */
export class WindowGestures {
  readonly #store: WindowGestureStore;

  /** 생략된 Store에는 현재 runtime의 정적 WindowStore를 사용한다. */
  constructor(store: WindowGestureStore = WindowStore) {
    this.#store = store;
  }

  /**
   * 현재 snapshot에서 visible desktop Session의 시작 frame을 캡처한다.
   *
   * maximized move는 허용하고 첫 update에서 즉시 normal placement로 복원하지만 maximized resize는 거절한다.
   */
  begin(request: WindowGestureRequest): WindowGestureStartResult {
    const snapshot = this.#store.getSnapshot();
    if (request.kind !== "move" && request.kind !== "resize") {
      return Object.freeze({ status: "rejected", reason: "invalid-kind" });
    }
    const session = snapshot.sessions.find(({ id }) => id === request.sessionId);
    if (session === undefined)
      return Object.freeze({ status: "rejected", reason: "session-not-found" });
    if (snapshot.mode === "mobile")
      return Object.freeze({ status: "rejected", reason: "mobile-mode" });
    if (session.frame.minimized) return Object.freeze({ status: "rejected", reason: "minimized" });
    if (request.kind === "resize" && session.frame.placement === "maximized") {
      return Object.freeze({ status: "rejected", reason: "maximized-resize" });
    }

    const startFrame = Object.freeze({
      ...session.frame,
      normalBounds: Object.freeze({ ...session.frame.normalBounds }),
    });
    const startBounds = Object.freeze({
      ...getWindowBounds(startFrame, snapshot.workArea, snapshot.mode),
    });
    let active = true;
    let tail = Promise.resolve();

    /** 활성 gesture의 bounds update를 Store 호출 순서대로 연결한다. */
    const update = (bounds: WindowRect): Promise<WindowGestureUpdateResult> => {
      if (!active) return Promise.resolve(Object.freeze({ status: "inactive" }));
      const requestedBounds = Object.freeze({ ...bounds });
      const result = tail.then(() =>
        this.#store.applyGestureBounds(request.sessionId, requestedBounds, request.kind),
      );
      tail = settledTail(result);
      return result.then((storeResult) => Object.freeze({ status: "applied", storeResult }));
    };

    /** 이후 update를 즉시 차단하고 이미 접수한 update가 끝나면 일반 종료한다. */
    const finish = (): Promise<WindowGestureFinishResult> => {
      if (!active) return Promise.resolve(Object.freeze({ status: "inactive" }));
      active = false;
      return tail.then(() => Object.freeze({ status: "finished" }));
    };

    /** 이후 update를 차단하고 접수된 update 뒤 시작 frame을 한 번 복구한다. */
    const cancel = (): Promise<WindowGestureCancelResult> => {
      if (!active) return Promise.resolve(Object.freeze({ status: "inactive" }));
      active = false;
      const result = tail.then(() => this.#store.restoreFrame(request.sessionId, startFrame));
      tail = settledTail(result);
      return result.then((storeResult) => Object.freeze({ status: "cancelled", storeResult }));
    };

    return Object.freeze({
      status: "started",
      handle: Object.freeze({
        sessionId: request.sessionId,
        kind: request.kind,
        startBounds,
        startFrame,
        update,
        finish,
        cancel,
      }),
    });
  }
}
