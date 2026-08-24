# HDJG-37 — [App 17] 정적 ContentCatalog·Notion Renderer와 Design Shell 연결

h2. 목적

sync-to-repo로 생성된 정적 Notion Content와 Folder 정의를 application Catalog로 제공하고 Resource resolver를 통해 Shell에 연결한다.

h2. 범위

* normalized static ContentCatalog/FolderCatalog
* application Resource resolver adapter
* Content renderer를 Window content slot에 연결
* 삭제된 Content Pin reconcile
* router/deep-link 연결 범위

h2. 완료 조건

* runtime Notion subscription이나 permission/loading Store를 추가하지 않는다.
* Notion SDK/block type이 packages/design에 들어가지 않는다.
* Content title/body가 Session/Pin에 복제되지 않는다.
* 새 배포의 Catalog 변경이 모든 Surface에 동일하게 반영된다.
* 삭제된 Content의 Pin이 초기화 시 제거된다.

h2. 선행 단계

Core 07, Folder 15, Shell 13, Mobile 16

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-37
