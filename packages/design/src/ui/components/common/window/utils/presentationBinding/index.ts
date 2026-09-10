/**
 * @file 외부 앱에서 Window Runtime의 전환 요청을 화면의 `WindowRoot`에 전달할 때 쓰는 연결 객체다.
 *
 * Runtime이 상태를 바꾼 뒤 보낸 열기·닫기·최소화·복원·최대화 요청을 해당 창에 전달하고,
 * 창이 아직 mount되지 않았으면 잠시 보관한다. 실제 상태 변경과 DOM animation은 담당하지 않는다.
 */
import type {
  WindowPresentationPort,
  WindowPresentationRequest,
  WindowSessionId,
} from "../../../../../../headless/windows/index.js";

/** `WindowRoot`가 실행할 전환 요청을 받으며, `null`은 현재 요청이 끝났음을 뜻한다. */
export type WindowPresentationConsumer = (request: WindowPresentationRequest | null) => void;

/**
 * Window Runtime이 보낸 전환 요청을 같은 Session의 `WindowRoot`에 전달하는 외부 앱용 연결 객체다.
 *
 * 외부 앱은 이 객체 하나를 Runtime의 `windowPresentation`과 각 `WindowRoot`의
 * `presentationBinding`에 함께 전달한다.
 */
export type WindowPresentationBinding = Omit<WindowPresentationPort, "release"> &
  Readonly<{
    /** 완료된 요청이 현재 요청과 같을 때 해당 창에서 제거한다. */
    release(request: WindowPresentationRequest): void;
    /** 한 창의 `WindowRoot`를 연결하고, 먼저 도착해 있던 요청이 있으면 즉시 전달한다. */
    mount(sessionId: WindowSessionId, consumer: WindowPresentationConsumer): () => void;
  }>;

/** 늦게 끝난 animation이 더 새로운 요청을 지우지 않도록 두 요청의 식별값을 비교한다. */
const isSamePresentation = (
  current: WindowPresentationRequest,
  requested: WindowPresentationRequest,
): boolean =>
  current.operationId === requested.operationId &&
  current.sessionId === requested.sessionId &&
  current.phase === requested.phase;

/**
 * 외부 앱에서 Window Runtime과 모든 `WindowRoot` 사이에 공유할 연결 객체를 만든다.
 *
 * 앱 초기화 때 한 번 만들고 Runtime의 `windowPresentation`과 각 `WindowRoot`의
 * `presentationBinding`에 같은 객체를 전달한다. `WindowRoot`보다 요청이 먼저 도착하면
 * 해당 창이 mount될 때까지 보관한다. 실제 창 상태는 Window Store가, DOM animation은 `WindowRoot`가 맡는다.
 */
export const createWindowPresentationBinding = (): WindowPresentationBinding => {
  const requests = new Map<WindowSessionId, WindowPresentationRequest>();
  const consumers = new Map<WindowSessionId, WindowPresentationConsumer>();

  return Object.freeze({
    /** Runtime이 요청한 전환을 보관하고, 준비된 해당 창의 `WindowRoot`에 전달한다. */
    present: (request: WindowPresentationRequest) => {
      requests.set(request.sessionId, request);
      consumers.get(request.sessionId)?.(request);
    },
    /** 현재 요청이 끝났을 때만 제거하며, 이전 animation에서 늦게 온 완료 보고는 무시한다. */
    release: (request: WindowPresentationRequest) => {
      const current = requests.get(request.sessionId);
      if (current === undefined || !isSamePresentation(current, request)) return;
      requests.delete(request.sessionId);
      consumers.get(request.sessionId)?.(null);
    },
    /** 한 창의 `WindowRoot`를 연결하며, 반환한 함수는 root 연결만 해제하고 요청은 유지한다. */
    mount: (sessionId: WindowSessionId, consumer: WindowPresentationConsumer) => {
      consumers.set(sessionId, consumer);
      consumer(requests.get(sessionId) ?? null);
      return () => {
        if (consumers.get(sessionId) === consumer) consumers.delete(sessionId);
      };
    },
  });
};
