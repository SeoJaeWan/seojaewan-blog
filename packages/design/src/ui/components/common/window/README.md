# Common Window 사용 안내

`WindowRoot`는 `HeadlessRuntimeProvider` 아래에서 `WindowStore` snapshot을 읽어 active, bounds,
placement, mode와 stacking을 `WindowFrame`에 전달한다. pointer·focus activation과 최소화·최대화·닫기
control은 기존 `WindowAction` queue를 사용한다. `WindowFrame`, `WindowTitleBar`, `WindowControls`와
`WindowResizeHandles`는 상태를 계산하지 않는 controlled parts다.

File Explorer와 Chrome의 tab, navigation과 body는 각 제품 또는 Application renderer가 `titleBarContent`와
`children`에 제공한다. Common Window Story의 해당 영역은 frame 비교를 위한 명시적 placeholder이며 완성된
File Explorer·Chrome 화면이 아니다.

## 구성

```text
window/
  controls/            창 조작 버튼과 Story
  frame/               창 테두리와 Story
  root/                headless 상태와 Common Window 조합
    hooks/
      useWindowPointerGesture/
      useWindowPresentation/
  titleBar/            제목 표시줄, drag 영역과 Story
  resizeHandles/       여덟 방향 크기 조절 영역
  utils/
    presentationBinding/ 외부 Runtime과 WindowRoot를 연결하는 공개 utility
```

각 폴더의 `index.ts(x)`가 구현 진입점입니다. 두 Hook은 `WindowRoot`만 사용하므로 root 가까이에 두고,
pointer capture·rAF·DOM animation·focus처럼 브라우저에 연결된 동작을 담당합니다. 순수 bounds 계산과
Operation 순서는 headless가 담당합니다. `presentationBinding`은 `@window/design`을 사용하는 외부 앱이
Runtime과 `WindowRoot` 양쪽에 전달하는 공개 연결 utility입니다.

## Runtime presentation 연결

새 Window는 semantic commit 직후 presentation을 요청하므로 Component mount보다 요청이 먼저 올 수 있다.
외부 앱에서 `createWindowPresentationBinding`으로 한 번 만든 객체를 runtime과 root에 함께 전달하면
DOM-free 숫자 요청을 Session별로 보관했다가 정확한 root에 전달합니다.

```tsx
import {
  HeadlessRuntimeProvider,
  type WindowMotionDestination,
  type WindowSessionId,
  WindowRoot,
  createHeadlessRuntime,
  createWindowPresentationBinding,
} from "@window/design";

const windowPresentation = createWindowPresentationBinding();
const runtime = createHeadlessRuntime({ windowPresentation });
const placementConfig = {
  defaultSize: { width: 840, height: 500 },
  minSize: { width: 320, height: 240 },
  edgeMargin: 8,
  cascadeOffset: { x: 24, y: 24 },
  titlebarRecoverySize: { width: 120, height: 30 },
};

const ApplicationWindow = ({
  sessionId,
  taskbarIconBounds,
}: {
  sessionId: WindowSessionId;
  taskbarIconBounds: WindowMotionDestination;
}) => (
  <HeadlessRuntimeProvider runtime={runtime}>
    <WindowRoot
      aria-label="Chrome 창"
      minimizeDestination={taskbarIconBounds}
      placementConfig={placementConfig}
      presentationBinding={windowPresentation}
      sessionId={sessionId}
      titleBarContent="Chrome"
    >
      {/* 실제 Chrome body renderer */}
    </WindowRoot>
  </HeadlessRuntimeProvider>
);
```

`minimizeDestination`에는 제품 root가 실제 `TaskbarApplicationButton` icon의
`getBoundingClientRect()`에서 읽은 viewport 숫자를 전달한다. Taskbar 위치나 viewport가 바뀌면 다음
최소화·복원 Action 전에 다시 측정한다. Common은 Taskbar DOM을 탐색하지 않는다.

현재 binding은 `{ operationId, sessionId, phase }`를 root의 `data-presentation-*` 입력으로 연결하고
Operation 대기가 끝나면 exact request를 제거한다. 실제 animation·presence·focus 완료 판정은 이 숫자 요청을
사용하는 Component lifecycle이 담당하며, timer나 가짜 완료 신호로 대신하지 않는다. enter·restore는 200ms,
exit·minimize·일반 maximize는 150ms이며 정상 결과는 실제 `Animation.finished` 뒤에만 보고한다. reduced motion은
즉시 완료하고 unmount·실패·gesture 중단은 정상 완료와 구분해 registry를 정리한다.

최소화된 root는 Session content를 unmount하지 않고 `hidden`, `inert`, `aria-hidden`으로 keyboard와 접근성
탐색에서 제외한다. restore는 최소화 control이 덮어쓰지 않은 이전 focus element를 복원하고, element가
사라졌거나 hidden·inert·disabled 상태 등으로 focus를 받을 수 없으면 focusable root로 돌아간다. active
close·minimize는 다음 visible root에 focus하며 남은 창이 없으면 Taskbar로 옮기지 않고 focus를 잃은 상태로
둔다.

`placementConfig`는 `WindowStore.initialize`에 전달한 같은 객체를 사용한다. `WindowRoot`는 빈 titlebar와
8방향 handle의 pointer를 capture하고 최신 좌표를 rAF마다 `actions.beginGesture` Handle의 numeric bounds로
전달한다. `Escape`는 Handle의 시작 frame을 복구하며 capture 상실·unmount는 접수된 update까지만 끝낸다.

## 검증

- 일반 Story는 처음 화면을 유지하므로 사용자가 직접 이동·최소화·복원할 수 있습니다.
- 자동으로 창을 이동하거나 닫는 browser 시나리오는 일반 목록에서 숨긴 test 전용 Story에서 같은
  fixture를 검증합니다.
- `pnpm --filter @window/design exec vitest run --project ui --no-cache`
- `pnpm --filter @window/design exec vitest run --project storybook --no-cache`
- `pnpm --filter @window/design exec tsc --noEmit --incremental false -p tsconfig.json`
