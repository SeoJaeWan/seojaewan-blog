# HDJG-55 — [Chrome 17] Notion Renderer·Find·Loading·Scroll State

h2. 목적

정적 Content snapshot을 packages/ui의 시각 결과와 동등한 Notion 본문으로 렌더링하고 tab별 읽기 상태를 유지한다.

h2. 선행 작업

* HDJG-54
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 제목과 지원 Notion block 본문 렌더링
* packages/ui style·asset·layout reference 이관
* Ctrl/Cmd+F find panel, match count, next/previous
* tab별 scroll·toggle·find state와 refresh/open lifecycle
* loading/image failure/빈 Content 결과, 이미지 확대 제외

h2. 완료 기준

* 지원 block fixture가 실제 snapshot schema를 사용한다.
* 같은 창에서 기존 tab은 snapshot을 유지하고 진짜 새 창은 최신 배포 snapshot을 사용한다.
* 동일 viewport에서 주요 Content fixture를 packages/ui와 side-by-side 비교한다.

h2. Canonical Local Work Memory

* {{chrome-notion-content}}
* {{chrome-find-in-page}}
* {{notion-content-pipeline}}
* {{notion-block-inventory}}
* {{chrome-window-layout-responsive}}
* {{testing}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-55
