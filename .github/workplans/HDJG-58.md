# HDJG-58 — [Application 20] Routing·Deploy Snapshot·Mobile Single Session

h2. 목적

정적 Content 배포 snapshot, 직접 URL 진입, route 동기화, 404와 모바일 단일 세션을 Application에서 통합한다.

h2. 선행 작업

* HDJG-57
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* /{categorySlug} Folder와 /{categorySlug}/{contentSlug} Chrome routing
* browser reload/direct entry와 Application WindowSession bootstrap
* 창 close/minimize 시 / route, 다른 창 focus 시 route 재활성
* Notion 변경→Content JSON 생성→재배포 snapshot 경계
* mobile Folder↔Chrome 단일 session과 Chrome close 시 부모 Folder

h2. 완료 기준

* 클라이언트 refresh button이 배포 snapshot을 재수집하지 않는다.
* 배포 snapshot에 없는 category/content만 각 제품 404로 처리된다.
* desktop multi-session과 mobile single-session E2E가 검증된다.

h2. Canonical Local Work Memory

* {{application-resource-routing-404}}
* {{notion-content-pipeline}}
* {{window-session}}
* {{taskbar-mobile}}
* {{resource-model}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-58
