# Operation runtime 사용 안내

`runtime`은 feature Action을 실행할 때 필요한 세 가지 DOM-free 기반을 제공한다. `OperationHandle`은 semantic commit, UI 표현과 전체 종료를 별도 Promise로 공개하고, `OperationTargetQueue`는 같은 target을 `settled`까지 순서대로 실행하며, `TransitionRegistry`는 operation ID와 phase에 맞는 UI 완료 신호를 연결한다.

이 기능은 Store 상태 계산, 저장, DOM event와 실제 animation을 구현하지 않는다. Store command 연결과 동작별 commit 순서는 feature Operation이 소유하고, Component는 전달받은 operation ID와 phase로 완료·중단·실패만 보고한다. 지속적인 계약의 정본은 Workbench Local Work Memory의 `action-operation`, `transition-lifecycle`, `module-boundaries`, `coding`, `testing`이다.

## 기본 실행

```ts
const queue = new OperationTargetQueue<WindowSessionId>();
const transitions = new TransitionRegistry();

const handle = queue.enqueue(sessionId, async (operation) => {
  const storeResult = await commitWindowCommand();
  operation.completeCommitted(storeResult);

  const presentationPromise = transitions.waitFor(operation.operationId, "enter");
  operation.onCleanup(() => {
    transitions.abortOperation(operation.operationId, "operation-settled");
  });
  requestWindowTransition({ operationId: operation.operationId, phase: "enter" });
  const presentation = await presentationPromise;
  operation.completePresented(presentation);

  return { status: "settled", storeResult, presentation } as const;
});

await handle.settled;
```

`committed`는 해당 명령의 semantic 상태가 반영된 시점이고 저장이나 animation 완료를 뜻하지 않는다. `presented`는 이 Operation이 소유한 transition의 완료·중단·watchdog·실패 결과다. `settled`는 Store 저장을 포함해 executor와 cleanup이 모두 끝난 뒤 완료되므로 일반 caller는 이를 기다린다.

no-op과 제품 거절은 feature가 정한 tagged 결과로 `completeCommitted`, `completePresented`, executor 반환값을 모두 명시적으로 끝낸다. executor 예외, 완료하지 않은 phase와 cleanup 예외만 `OperationRuntimeFailure`가 된다. 예외가 나도 target queue tail은 정상화되어 다음 요청이 실행된다.

## 생성 뒤 target 연결

Window 생성처럼 Session ID가 semantic commit 뒤 생기는 Operation은 `reserve`로 먼저 실행한다. ID를 받은 즉시 `operation.attachTarget(sessionId)`를 호출하면 그 뒤 들어오는 같은 Session 요청은 생성 Operation의 `settled` 이후 실행된다. 이미 다른 tail이 연결된 target이면 false를 반환하므로 feature는 ID 충돌이나 잘못된 연결로 처리해야 한다.

## transition 완료와 정리

Component는 `complete`, `abort`, `fail` 중 현재 phase에 맞는 신호를 한 번 보낸다. 중복 신호, 다른 phase 신호와 watchdog 뒤의 늦은 신호는 false로 무시된다. 기본 watchdog은 1000ms이며 정상 완료로 바꾸지 않고 `watchdog` 결과를 반환한다.

Operation executor는 `operation.onCleanup(() => transitions.abortOperation(operation.operationId, reason))`처럼 listener, timer 또는 남은 registry 대기를 등록할 수 있다. cleanup은 성공과 실패 경로 모두에서 실행되며 React 구독 정리나 Provider 재마운트를 사용자 Action 취소로 해석하는 용도가 아니다.

## React Provider와 controller 연결

Application은 Workspace → Window → Start → Taskbar 순서로 브라우저 Store를 초기화한 뒤 runtime을 render 바깥에서 한 번 만든다. Provider는 이 객체만 전달하며 Store snapshot을 Context state로 복사하거나 재마운트 때 초기화하지 않는다.

```ts
import {
  HeadlessRuntimeProvider,
  createHeadlessRuntime,
  useWindowController,
} from "@window/design";
import { createElement } from "react";

await initializeBrowserStores();
const runtime = createHeadlessRuntime();

const ApplicationRoot = () => {
  const { viewModel, actions } = useWindowController();
  if (viewModel.status === "not-ready") return null;

  return renderWindows(viewModel.snapshot, {
    onOpenChrome: async () => {
      const handle = actions.execute({ type: "create-chrome-window" });
      await handle.settled;
    },
  });
};

const application = createElement(
  HeadlessRuntimeProvider,
  { runtime },
  createElement(ApplicationRoot),
);
```

Foundation Store controller와 `usePrimaryPanelController`는 `useSyncExternalStore`로 기존 immutable snapshot을 구독한다. `viewModel`은 `{ status: "ready", snapshot }` 또는 `{ status: "not-ready", snapshot: null }`이고 `actions`는 별도 객체다. SSR과 hydration 첫 읽기는 같은 안정적인 `not-ready` 객체를 사용하며 서버에서 사용자 Store를 초기화하지 않는다. 일반 구독 cleanup은 listener만 제거하고 실행 중 Operation을 취소하지 않는다.

Window·Start·Taskbar Component는 Handle의 `operationId`와 현재 phase를 `completeTransition`, `abortTransition`, `failTransition`에 전달한다. 중복되거나 늦은 신호는 `false`이며 기존 결과를 바꾸지 않는다. Workspace는 현재 별도 UI transition을 소유하지 않아 `execute`만 제공한다.

runtime의 `primaryPanel` channel은 runtime별 in-memory state와 `PrimaryPanelOperations`를 조합한다.
responsive mode는 Action 실행 시 Window adapter에서 다시 읽으며, Window가 준비되지 않았거나 mobile이면
desktop panel activation을 명시적으로 거절한다. 이 channel은 DOM·Base UI callback을 알지 않고 후속
Taskbar 제품 connection이 operation ID와 enter/exit phase를 widget callback에 연결한다.
