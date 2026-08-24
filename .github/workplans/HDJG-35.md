# HDJG-35 — [Folder 15] Folder Resource와 Folder Window 연결

h2. 목적

Content가 아닌 Folder를 열 수 있는 Resource로 연결하고 FolderFrame/Viewer를 Session 기반으로 렌더링한다.

h2. 범위

* FolderCatalog와 Folder Resource resolver
* Folder Window connector/View Model
* Folder child Content open Action
* Folder Context Menu section
* Folder Session 다중 open

h2. 완료 조건

* 같은 Folder open마다 새 Session을 만든다.
* Folder에는 Taskbar/Window Panel Pin Action이 없다.
* Folder title/children을 Session에 복제하지 않는다.
* Folder에서 Content open 시 새 Content Session을 만든다.
* Folder 내부 history/navigation은 별도 확정 전 최소 계약으로 격리된다.

h2. 선행 단계

Core 07, Core 12, Shell 13

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-35
