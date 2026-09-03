# HDJG-53 — [Folder 15] Content·Selection·Search·View·Sort·Persistence

h2. 목적

Folder Content 영역의 표시, 다중 선택, open, 현재 category 검색, 보기·정렬과 폴더별 저장을 완성한다.

h2. 선행 작업

* HDJG-52
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* Notion Content icon/title/summary와 8개 view catalog
* click/Ctrl/Shift/marquee/keyboard 선택, 더블 클릭 1개 open, Enter 다중 새 창 open
* 빈 땅 click 선택 해제와 다른 window focus 시 비활성 선택 표현
* 현재 category 제목 fuzzy 검색·debounce·history
* 이름/날짜, 오름/내림차순, folder별 view/sort localStorage

h2. 완료 기준

* 선택 개수 제한이 없고 status bar에 전체 중 선택 수가 표시된다.
* 세로 scroll만 사용하고 긴 값은 column ellipsis 처리한다.
* 보기 변경 후 선택 복원, 동일 Folder window snapshot과 새 창 최신 설정 규칙이 검증된다.

h2. Canonical Local Work Memory

* {{folder-content-interaction}}
* {{folder-search}}
* {{folder-view-sort-settings}}
* {{frequent-content-history}}
* {{testing}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-53
