# Common Window 사용 안내

`WindowRoot`는 `HeadlessRuntimeProvider` 아래에서 `WindowStore` snapshot을 읽어 active, bounds,
placement, mode와 stacking을 `WindowFrame`에 전달한다. pointer·focus activation과 최소화·최대화·닫기
control은 기존 `WindowAction` queue를 사용한다. `WindowFrame`, `WindowTitleBar`, `WindowControls`와
`WindowResizeHandles`는 상태를 계산하지 않는 controlled parts다.

File Explorer와 Chrome의 tab, navigation과 body는 각 제품 또는 Application renderer가 `titleBarContent`와
`children`에 제공한다. Common Window Story의 해당 영역은 frame 비교를 위한 명시적 placeholder이며 완성된
File Explorer·Chrome 화면이 아니다.

## Runtime presentation 연결

새 Window는 semantic commit 직후 presentation을 요청하므로 Component mount보다 요청이 먼저 올 수 있다.
runtime과 root에 같은 binding을 전달하면 DOM-free 숫자 요청을 Session별로 보관했다가 정확한 root에 전달한다.

```tsx
import {
  HeadlessRuntimeProvider,
  type WindowSessionId,
  WindowRoot,
  createHeadlessRuntime,
  createWindowPresentationBinding,
} from "@window/design";

const windowPresentation = createWindowPresentationBinding();
const runtime = createHeadlessRuntime({ windowPresentation });

const ApplicationWindow = ({ sessionId }: { sessionId: WindowSessionId }) => (
  <HeadlessRuntimeProvider runtime={runtime}>
    <WindowRoot
      aria-label="Chrome 창"
      presentationBinding={windowPresentation}
      sessionId={sessionId}
      titleBarContent="Chrome"
    >
      {/* 실제 Chrome body renderer */}
    </WindowRoot>
  </HeadlessRuntimeProvider>
);
```

현재 binding은 `{ operationId, sessionId, phase }`를 root의 `data-presentation-*` 입력으로 연결하고
Operation 대기가 끝나면 exact request를 제거한다. 실제 animation·presence·focus 완료 판정은 이 숫자 요청을
사용하는 Component lifecycle이 담당하며, timer나 가짜 완료 신호로 대신하지 않는다.

## 검증

- `pnpm --filter @window/design exec vitest run --project ui --no-cache`
- `pnpm --filter @window/design exec vitest run --project storybook --no-cache`
- `pnpm --filter @window/design exec tsc --noEmit --incremental false -p tsconfig.json`
