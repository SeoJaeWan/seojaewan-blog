# HDJG-27 — [Core 07] ResourceRef와 정적 Catalog Resolver 계약 구현

h2. 목적

Content와 Resource를 분리하고 Content/Folder를 Window 시스템이 공통으로 참조할 수 있는 최소 계약을 구현한다.

h2. 범위

* ResourceRef와 안정적인 직렬화 ResourceId
* Content/Folder kind와 capability
* ContentCatalog/FolderCatalog fixture
* resource resolver와 Surface View Model selector 기반

h2. 완료 조건

* Content title/body를 Resource, Session, Pin에 복제하지 않는다.
* Folder는 open 가능하지만 Pin 불가능하다.
* Content는 Taskbar/Window Panel Pin 가능하다.
* title/slug가 아닌 안정적인 source ID를 사용한다.
* 삭제되거나 유효하지 않은 Resource를 판별할 수 있다.

h2. 선행 단계

Design 01

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-27
