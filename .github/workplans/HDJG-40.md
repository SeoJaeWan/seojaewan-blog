# HDJG-40 — [Foundation 02] Resource·ContentCatalog·ExternalShortcut 모델

h2. 목적

Folder, Content, ExternalShortcut의 정체성과 capability를 Application 데이터와 분리된 안정적 계약으로 확정한다.

h2. 선행 작업

* HDJG-39
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* ResourceRef와 Folder·Content·ExternalShortcut 종류 및 capability
* 정적 ContentCatalog resolver와 disabled/reconcile 규칙
* ExternalShortcut의 새 탭 open, URL, label, icon, 정렬 metadata
* 제품 UI가 catalog 원본을 복제하지 않고 읽기 전용 View Model을 받는 경계

h2. 완료 기준

* 유효·누락·비활성 Resource 해석이 pure test로 검증된다.
* Resource와 Notion 원본, UI 표시 데이터의 소유권이 분리된다.
* ExternalShortcut이 Folder/Chrome WindowSession이나 Taskbar Group으로 잘못 모델링되지 않는다.

h2. Canonical Local Work Memory

* {{resource-model}}
* {{external-shortcut-resource}}
* {{notion-content-pipeline}}
* {{module-boundaries}}
* {{state-ownership}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-40
