# HDJG-46 — [Taskbar 08] 시작 화면·고정·모두 보기·Index

h2. 목적

Start를 persisted Pin과 transient browse 상태가 분리된 제품 화면으로 완성한다. pinned grid,
Content·ExternalShortcut 모두 보기, category index, drag reorder와 Resource open 결과를 기존 Taskbar
primary panel lifecycle에 연결한다.

h2. 확정 계약

- Start는 pinned 화면으로 열리고 상단 Search input을 자동 focus하지 않는다.
- pinned에는 Folder, Content와 ExternalShortcut을 표시한다. label은 현재 Catalog 또는 Workspace에서
  파생하고 identity와 순서는 기존 `StartStore`가 저장한다.
- 모두 보기에는 Content와 ExternalShortcut을 표시하고 Folder를 제외한다.
- 모두 보기 group 순서는 A–Z, 한글 초성 ㄱ–ㅎ, 첫 글자별 0–9, 기호 #이다. group 안은 현재
  title/name 오름차순이다.
- ExternalShortcut에는 사용 가능 여부 상태나 그에 따른 filter를 두지 않는다. 실제 새 탭 adapter가
  반환한 성공·실패만 open 결과로 사용한다.
- index 선택은 실제 heading으로 scroll하고 overlay를 닫는다. keyboard와 focus는 유효한 heading 또는
  overlay opener로 이동한다.
- pinned와 모두 보기 header는 같은 title typography와 spacing을 사용하며 500ms 수평 slide로
  전환한다. 이 전환에 opacity 변화나 즉시 숨김을 섞지 않는다.
- index는 항목이 있는 group만 표시한다. 목록과 overlay는 500ms scale·opacity로 전환하되 전환 중
  scrollbar를 숨기고, group 선택 시 목록 위치를 먼저 즉시 맞춘 뒤 overlay를 닫고 heading에 focus한다.
- pin, unpin과 reorder는 기존 Start Action·Operation을 사용한다. pointer drag는 이전 위치 측정,
  commit, 새 위치 측정과 150ms 이동 표현 순서를 따른다.
- Folder·Content는 기존 Window Action으로, ExternalShortcut은 새 탭 navigation port로 연다.
  current activation의 성공 결과만 Start를 닫고, 실패와 stale 결과는 현재 panel과 browse 상태를
  유지한다. transient 상태는 close 완료 뒤 초기화하며 stored Pin은 보존한다.
- query가 있으면 Start shell과 input을 유지하고 Search 본문 경계로 전환한다.

h2. 구현 및 후속 소유권

| 계약                                       | 이번 구현                                                         | 명시적 후속 소유자                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| REQ-001, REQ-003–005, REQ-012 / AC-001–004 | Start screen headless state·selector와 All/Index 제품 Component   | 없음                                                                                                    |
| REQ-002, REQ-006–007, REQ-011 / AC-005–006 | 기존 Start Pin runtime, pinned grid, keyboard와 pointer reorder   | HDJG-49가 제공된 label·reorder capability로 Context Menu UI를 연결                                      |
| REQ-008–009 / AC-007–008                   | `resourceOpen`, panel activation tracking과 Start 제품 connection | HDJG-52–55가 실제 Window 본문을, HDJG-58이 Catalog·router·storage·navigation adapter와 제품 tree를 연결 |
| REQ-010 / AC-009                           | query 유무에 따른 Start browse/Search body 경계                   | HDJG-47이 result·recent·recommendation·ranking·detail을 연결                                            |
| NFR-004–005 / AC-010–011                   | owner README, jsdom, headless, Chromium Story와 legacy 비교       | 각 후속 제품 흐름의 Application E2E는 해당 작업이 소유                                                  |
| AC-012                                     | 이 Workplan과 아래 PR 전달 문구                                   | PR 본문 반영은 수동 전달 단계                                                                           |

Start screen semantic state와 Pin persistence는 별도 runtime channel이다. Product Component는 DOM
scroll, focus, pointer와 animation을 소유하고 Store를 직접 변경하지 않는다. ExternalShortcut은 내부
`WindowSession`을 만들지 않으며 외부 사이트의 응답 상태를 조회하지 않는다.

h2. 검증 계약

- headless: pinned/all/index changed·no-op·reset, Folder 제외, Content·ExternalShortcut 포함,
  A–Z·ㄱ–ㅎ·개별 0–9·# 분류와 group 내부 정렬
- Resource lifecycle: Window commit·충족된 no-op 성공, 거절·실행 오류·presentation 실패,
  external navigation 성공·실패·throw, duplicate·inactive·stale request와 close 완료 초기화
- Product jsdom: current label·reorder capability, empty/long label, Action mapping과 query body 전환
- Storybook Chromium: 6열 keyboard·pointer drag·150ms movement, slide-only browse 전환,
  실제 group만 있는 4열 index·focus·# scroll·scrollbar가 숨겨진 500ms 전환,
  전체 Start open·query·Resource success·reopen 흐름
- pinned legacy 비교: 6열, 34px icon, 8px 12px tile padding, 12px 두 줄 label과 150ms 이동 표현을
  유지한다. persisted `ResourceRef`, keyboard grid와 pointer FLIP은 current architecture에 맞춘 차이다.
- All/Index legacy 비교: 4열, 8px gap, 20px index, 16px list padding, 25px row icon, 14px row,
  500ms list/index scale·opacity 전환과 항목이 있는 group만 표시하는 결과를 유지한다. current 구현은
  숫자를 0–9로 나누고 전환 중 scrollbar를 숨긴다. legacy의 숫자→# 분류와 local state는 가져오지 않는다.

최종 통합 head에서 다음을 모두 실행한다.

문서 drift phrase scan과 `git diff --check` 뒤 root `pnpm verify`, `@window/design`의 Chromium
Storybook test와 static Storybook build를 차례로 실행한다.

h2. Canonical Local Work Memory

- `start-screen@01a089ca-f8af-7b05-b5a8-8ac2650060f0`
- `taskbar-panel-lifecycle@01a088ca-b0ac-728f-ac9f-5f474dbca31c`
- `hdjg-46-start-screen-scope-decision@01a088cc-93d5-73e8-81a2-8563300cc031`

h2. PR 전달 문구

PR #27 본문은 전달 시 이 문서의 확정 계약과 검증 결과를 요약해 수동으로 교체한다. 모두 보기의
대상은 Content와 ExternalShortcut이며 Folder는 제외한다. group은 A–Z, ㄱ–ㅎ, 개별 0–9, # 순서다.
ExternalShortcut은 별도의 사용 가능 여부 모델 없이 실제 navigation 결과를 사용한다. Search 결과와
detail은 HDJG-47, Context Menu UI는 HDJG-49, 실제 Window/Application 조합은 HDJG-52–55·58의 경계로
남는다.

이 후속 수정에서는 push와 PR 본문 변경을 수행하지 않는다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-46
