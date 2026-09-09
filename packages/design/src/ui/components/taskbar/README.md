# Taskbar 사용 안내

Taskbar는 화면 아래에서 시작, 검색, 앱 실행, 시간과 날짜를 보여 주는 제품 구성 요소입니다.
현재 구현은 데스크톱과 모바일의 기본 배치, 입력 전달과 상태 표현을 제공합니다.

## 구성

```text
taskbar/
  root/       전체 배치와 데스크톱·모바일 구성을 선택합니다.
  start/      시작 메뉴 열기 요청을 전달합니다.
  search/     검색어 입력과 검색 진입 요청을 전달합니다.
  items/      파일 탐색기와 Chrome 앱 버튼을 표시합니다.
  timestamp/  현재 지역의 시간과 날짜를 표시합니다.
```

각 역할에 구현이 하나일 때는 해당 폴더의 `index.ts(x)`가 구현 진입점입니다. 역할 안에 독립적인
요소가 추가되면 하위 폴더로 나누고 상위 `index.ts`에서 공개 API를 모읍니다. 예를 들어 Search에
별도 버튼이 추가되면 `search/input/index.tsx`, `search/button/index.tsx`로 나누고
`search/index.ts`에서 두 요소를 export합니다.

## 기본 사용

`TaskbarRoot`는 `HeadlessRuntimeProvider` 안에서 사용합니다. 시작과 검색 요청은 headless Action으로
전달하고, 검색어와 준비 상태처럼 화면 밖에서 관리할 값은 props로 받습니다.

```tsx
import {
  HeadlessRuntimeProvider,
  TaskbarRoot,
  createHeadlessRuntime,
} from "@window/design";

const runtime = createHeadlessRuntime();

const ApplicationTaskbar = () => (
  <HeadlessRuntimeProvider runtime={runtime}>
    <TaskbarRoot
      searchValue=""
      onSearchValueChange={(value) => {
        // Application이 검색어를 저장합니다.
      }}
    />
  </HeadlessRuntimeProvider>
);
```

## 연결 경계

- Taskbar는 버튼 입력과 현재 상태의 표시를 담당합니다.
- 실제 시작·검색 패널, 데스크톱 실행 앱 목록과 창 미리보기는 해당 제품 구성 요소에서 연결합니다.
- 앱 버튼으로 창을 열거나 복원하는 정책과 Window Session 상태는 headless Window·Taskbar 계약이
  담당합니다.
- 창 최소화 애니메이션에 필요한 아이콘 위치는 제품 조합 지점에서 측정해 Common Window에 숫자로
  전달합니다.

## 확인

- Storybook의 `Design/Components/Taskbar`에서 안정된 시작 상태와 상태별 모습을 직접 확인합니다.
- `*.test.tsx`는 정적인 DOM과 Action 연결을 확인합니다.
- Storybook browser 검사는 실제 키보드·포인터·포커스 동작을 확인합니다.

```sh
pnpm --filter @window/design exec vitest run --project ui --no-cache
pnpm --filter @window/design exec vitest run --project storybook --no-cache
```
