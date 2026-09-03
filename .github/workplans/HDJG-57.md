# HDJG-57 — [Integration 19] Taskbar Live Preview와 Folder·Chrome 연결

h2. 목적

Taskbar preview를 실제 Folder/Chrome viewport에 연결해 현재 화면·scroll·선택 tab을 축소 표시하고 target activation을 완성한다.

h2. 선행 작업

* HDJG-56
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* Folder/Chrome viewport snapshot adapter
* 현재 scroll 위치·view mode·render state 반영
* Folder Group target tab과 Content Group ChromeTab identity 연결
* preview click 시 해당 session과 tab activate
* preview close와 Group 모든 창 닫기의 정확한 tab 범위

h2. 완료 기준

* mock 카드가 아니라 실제 viewport 결과가 축소된다.
* scroll 후 preview에 같은 구간이 표시된다.
* 복수 session/tab activation과 close가 vertical-slice test로 검증된다.

h2. Canonical Local Work Memory

* {{taskbar-session-preview}}
* {{taskbar-group}}
* {{folder-window-layout-responsive}}
* {{chrome-window-layout-responsive}}
* {{window-session}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-57
