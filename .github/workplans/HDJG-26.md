# HDJG-26 — [Design 06] Window·Taskbar·Folder UI Component와 Pattern 재구축

h2. 목적

기존 visual reference를 바탕으로 제품 시각 부품을 Store와 business data에 독립적인 component/pattern으로 다시 만든다.

h2. 범위

* WindowFrame/WindowTitleBar/WindowControls
* TaskbarItem/TaskbarRoot/Preview visual
* WindowPanel/FolderFrame/FolderViewer
* Context Menu, Bottom Sheet 조합 pattern
* entering/exiting/active/minimized visual state

h2. 완료 조건

* 작은 표시 props와 UI event만 받는다.
* onPin/onUnpin/onOpen/onClose 같은 business callback 묶음이 없다.
* Storybook에서 핵심 상태가 재현된다.
* 기존 visual reference와 주요 metric이 비교된다.
* UI가 Core/Shell/Application을 import하지 않는다.

h2. 선행 단계

Design 05

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
* 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-26
