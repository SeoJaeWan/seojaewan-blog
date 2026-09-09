# Taskbar 사용 안내

Taskbar는 화면 아래에서 시작, 검색, 앱 실행, 시간과 날짜를 보여 주는 제품 구성 요소입니다.
현재 구현은 데스크톱과 모바일의 기본 배치, 입력 전달과 상태 표현을 제공합니다. 데스크톱에서는
Start와 Search primary panel의 trigger, focus, dismiss, placement와 motion도 함께 제공합니다.

## 구성

```text
taskbar/
  root/                 전체 배치와 데스크톱·모바일 구성을 선택합니다.
  start/
    button/             Windows logo trigger를 표시합니다.
    root/               trigger와 Start panel을 조합합니다.
  search/
    input/              Taskbar의 실제 검색 input을 표시합니다.
    panel/              input과 Search panel을 조합합니다.
  panels/
    connection/         headless primary panel 상태와 callback을 연결합니다.
    surface/            공통 panel 외형과 responsive bounds를 제공합니다.
    widget/             trigger, portal, focus, dismiss와 motion을 제공합니다.
  items/                파일 탐색기와 Chrome 앱 버튼을 표시합니다.
  timestamp/            현재 지역의 시간과 날짜를 표시합니다.
```

각 역할에 구현이 하나일 때는 해당 폴더의 `index.ts(x)`가 구현 진입점입니다. 역할 안에 독립적인
요소가 추가되면 하위 폴더로 나누고 상위 `index.ts`에서 공개 API를 모읍니다. Start와 Search는
독립 요소를 각각 `button`·`root`, `input`·`panel`로 나누고 역할의 `index.ts`에서 export합니다.

## 기본 사용

`TaskbarRoot`는 `HeadlessRuntimeProvider` 안에서 사용합니다. Root가 한 primary panel connection을
만들고 Start와 Search에 나누어 주므로 application은 별도 panel callback이나 검색어 상태를 전달하지
않습니다.

```tsx
import { HeadlessRuntimeProvider, TaskbarRoot, createHeadlessRuntime } from "@window/design";

const runtime = createHeadlessRuntime();

export const DesktopTaskbar = () => (
  <HeadlessRuntimeProvider runtime={runtime}>
    <TaskbarRoot />
  </HeadlessRuntimeProvider>
);
```

현재 Root는 Start와 Search의 trigger, panel lifecycle과 query 초기화를 연결합니다. Start의 고정
목록·모두 보기와 Search의 결과·recent·detail 본문은 후속 제품 view에서 연결합니다.

## 연결 경계

- headless는 active panel, Start·Search 상호 배제, 순차 전환과 query 초기화 시점을 관리합니다.
- Taskbar Product Component와 Base UI는 trigger와 content 관계, focus, Escape, outside dismiss,
  portal, placement와 presence를 관리합니다.
- Search는 Taskbar의 실제 input 하나를 panel trigger로 사용하며 panel 안에 중복 input을 만들지
  않습니다.
- Search에서 Escape를 누르면 input focus를 해제합니다. panel close 완료 뒤 query를 비우며 focus를
  복원하지 않습니다.
- Resource는 열기에 성공한 뒤 panel을 닫고, 실패하면 query와 결과를 유지합니다. Context Menu는
  항목을 선택하면 즉시 닫습니다.
- 실제 Resource open, Catalog, router, storage와 Window 화면은 Application adapter 또는 후속 제품
  view에서 연결합니다.

상세 제품 정책은 Local Work Memory의 `Taskbar 기능 아키텍처`, `Taskbar Panel lifecycle 계약`,
`Taskbar Search 기능 계약`을 따릅니다.

## 검증

일반 Story는 안정된 시작 상태와 직접 조작 가능한 제품 예를 제공합니다. 자동 keyboard, focus,
dismiss, 전환 검사는 같은 fixture를 재사용하는 `*.test.stories.tsx`에 두고 `!dev`, `!autodocs` tag로
일반 sidebar와 Docs에서 숨깁니다.

- `*.test.tsx`: jsdom에서 결정적으로 관찰 가능한 제품 props, Action mapping과 정적 DOM 관계
- `*.test.stories.tsx`: Chromium에서 실제 keyboard, focus, portal, outside dismiss, collision과 motion 결과
- 일반 `*.stories.tsx`: 대표 상태, responsive visual과 직접 조작 가능한 제품 사용 예

```sh
pnpm --filter @window/design test
pnpm --filter @window/design test:storybook
```
