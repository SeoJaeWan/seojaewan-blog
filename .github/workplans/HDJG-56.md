# HDJG-56 — [Desktop 18] Surface·Items·Selection·Layout·Menu·Mobile

h2. 목적

Wallpaper 위에 Folder와 ExternalShortcut을 Windows 11식 아이콘 surface로 제공하고 선택·배치·메뉴·모바일 계약을 구현한다.

h2. 선행 작업

* HDJG-55
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* packages/ui wallpaper asset과 taskbar에 가려지는 viewport bounds
* Folder·ExternalShortcut icon/title, hover glass, double click open
* 2줄 기본·선택 시 전체 title, marquee·keyboard·drag
* 큰/보통/작은 아이콘, 이름/날짜, grid align toggle, 자유 배치 localStorage
* 빈 Desktop/항목 Context Menu와 모바일 기능 축소

h2. 완료 기준

* ExternalShortcut은 Chrome/Folder 없이 blank로 열린다.
* 경로로 복사는 Desktop Folder 메뉴에서 /{categorySlug}를 복사한다.
* desktop pointer/keyboard와 mobile open 경계가 테스트된다.

h2. Canonical Local Work Memory

* {{desktop-feature-architecture}}
* {{desktop-item-model}}
* {{desktop-icon-interaction}}
* {{desktop-view-sort-layout}}
* {{desktop-context-menu}}
* {{desktop-wallpaper}}
* {{desktop-mobile}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-56
