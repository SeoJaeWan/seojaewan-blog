# HDJG-50 — [Taskbar 12] Session Preview UI·Target Lifecycle

h2. 목적

작업 표시줄 Group의 실제 session/tab target을 선택·닫을 수 있는 Windows 11식 preview panel을 구현한다.

h2. 선행 작업

* HDJG-49
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* hover와 다중 target click 진입, 아이콘 중심 placement
* target별 icon·title·hover close X·실제 viewport 축소 화면
* 화면보다 넓으면 모든 preview가 보이도록 균등 축소
* close X는 target tab만 닫고 마지막 tab이면 WindowSession 종료
* hover 유지·dismiss·group/menu/panel 충돌 lifecycle

h2. 완료 기준

* preview item identity가 sessionId+tabId로 안정적이다.
* 현재 scroll 위치가 이후 live viewport integration에 전달될 계약이 있다.
* 키보드 접근성과 reduced-motion 상태가 테스트된다.

h2. Canonical Local Work Memory

* {{taskbar-session-preview}}
* {{taskbar-group}}
* {{taskbar-panel-lifecycle}}
* {{window-session}}
* {{testing}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-50
