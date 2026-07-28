# SearchPanelUI composition boundary

## 상태

TODO

## 배경

`packages/shell/src/taskbar/search`는 taskbar 검색어·결과·상세 선택을 관리하는 `useTaskSearch`와
결과 action을 Windows domain에 연결하는 `TaskSearchResultView`를 소유한다. 이 connector는 시작
panel과 향후 taskbar Search panel에서 같은 검색 결과 동작을 재사용하기 위한 경계다.

현재 `SearchPanelUI`는 `searchValue`에 따라 추천/결과 화면을 직접 분기하고
`TaskSearchResultViewUI`를 내부에서 생성한다. 따라서 향후 shell Search panel connector가 공용
`TaskSearchResultView`를 panel content로 주입할 수 없고, 같은 action props 조립을 다시 작성해야
한다.

## 목표

- `SearchPanelUI`는 floating panel의 visual surface와 layout만 소유한다.
- 추천 화면과 검색 결과 화면의 선택·조립은 shell connector가 제어할 수 있게 한다.
- Shell Search panel이 시작 panel과 같은 `useTaskSearch`, `TaskSearchResultView`를 재사용한다.
- UI package가 Windows event, pin Provider나 검색 상태 owner를 알지 않게 유지한다.

## composition 후보

- `recommendationView`, `resultView` 같은 controlled content slot
- `SearchPanelUI.Root`, `SearchPanelUI.Recommendations`, `SearchPanelUI.Results` 형태의 compound
  composition

정확한 API는 실제 shell Search panel connector를 구현할 때 결정한다. 단순히 기존 props를 slot과
동시에 유지해 두 개의 조립 경로를 만들거나, domain callback을 새 UI wrapper로 옮기지는 않는다.

## 완료 조건

- Shell Search panel이 `TaskSearchResultView`를 중복 action wiring 없이 결과 content로 사용한다.
- 추천/결과 전환 owner와 검색어 owner가 shell source에서 분명하게 드러난다.
- `SearchPanelUI`는 검색 결과 item, detail action과 pin 정책을 직접 해석하지 않는다.
- UI Storybook에서 추천, 결과, detail 선택 visual을 계속 독립적으로 확인할 수 있다.
- Shell Storybook에서 실제 Search panel trigger, panel lifecycle, 검색과 item action을 확인한다.
- 관련 UI/Shell typecheck, build와 검색 controller 테스트가 통과한다.

## 현재 작업과의 경계

공용 `useTaskSearch`와 `TaskSearchResultView` 추출, WindowPanel 연결 변경까지만 현재 작업에 포함한다.
`SearchPanelUI` API 변경과 shell Search panel connector 구현은 이 TODO의 후속 작업으로 남긴다.
