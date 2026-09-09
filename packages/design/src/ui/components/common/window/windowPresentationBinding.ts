/**
 * @file headless Window presentation 요청과 해당 Session의 제품 root mount를 연결한다.
 *
 * DOM animation과 transition 완료 판단은 소유하지 않고 serializable 요청의 전달·정리만 담당한다.
 */
import type {
  WindowPresentationPort,
  WindowPresentationRequest,
  WindowSessionId,
} from "../../../../headless/windows/index.js";

/** Window 제품 root가 현재 표현할 요청 또는 정리 사실을 받는 함수다. */
export type WindowPresentationConsumer = (request: WindowPresentationRequest | null) => void;

/**
 * runtime presentation port와 Session별 제품 root mount를 잇는 UI binding이다.
 *
 * 새 Window의 semantic commit 직후 root가 아직 mount되지 않았으면 숫자 요청을 보관하고,
 * 같은 Session이 mount될 때 전달한다. 별도 Store나 전역 구독 채널은 만들지 않는다.
 */
export type WindowPresentationBinding = Omit<WindowPresentationPort, "release"> &
  Readonly<{
    /** transition 대기가 끝난 exact request를 보관소와 연결된 root에서 제거한다. */
    release(request: WindowPresentationRequest): void;
    /** Session 제품 root를 연결하고 현재 보관 중인 정확한 요청을 즉시 전달한다. */
    mount(sessionId: WindowSessionId, consumer: WindowPresentationConsumer): () => void;
  }>;

/** operation ID와 phase가 모두 같은 presentation 요청인지 확인한다. */
const isSamePresentation = (
  current: WindowPresentationRequest,
  requested: WindowPresentationRequest,
): boolean =>
  current.operationId === requested.operationId &&
  current.sessionId === requested.sessionId &&
  current.phase === requested.phase;

/**
 * mount 전 요청을 Session별로 보관하는 Window presentation binding을 만든다.
 *
 * `present`는 요청을 저장한 뒤 연결된 root에 전달하고, `release`는 현재 요청과 정확히
 * 일치할 때만 보관값과 root 입력을 지운다. unmount는 제품 Operation을 취소하지 않는다.
 */
export const createWindowPresentationBinding = (): WindowPresentationBinding => {
  const requests = new Map<WindowSessionId, WindowPresentationRequest>();
  const consumers = new Map<WindowSessionId, WindowPresentationConsumer>();

  return Object.freeze({
    /** queue가 실행한 최신 숫자 요청을 보관하고 준비된 Session root에 전달한다. */
    present: (request: WindowPresentationRequest) => {
      requests.set(request.sessionId, request);
      consumers.get(request.sessionId)?.(request);
    },
    /** 완료·중단·watchdog으로 끝난 정확한 요청만 제거하고 늦은 정리는 무시한다. */
    release: (request: WindowPresentationRequest) => {
      const current = requests.get(request.sessionId);
      if (current === undefined || !isSamePresentation(current, request)) return;
      requests.delete(request.sessionId);
      consumers.get(request.sessionId)?.(null);
    },
    /** 한 Session root를 연결하고 cleanup에서는 현재 Operation이나 보관 요청을 건드리지 않는다. */
    mount: (sessionId: WindowSessionId, consumer: WindowPresentationConsumer) => {
      consumers.set(sessionId, consumer);
      consumer(requests.get(sessionId) ?? null);
      return () => {
        if (consumers.get(sessionId) === consumer) consumers.delete(sessionId);
      };
    },
  });
};
