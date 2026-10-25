# 애니메이션 남은 작업

2026-10-25 기준. 애니메이션(모션) 토대는 끝났다. 남은 순서는 1) 애니메이션 PR 처리 → 2) 조립 PR 처리 → 3) 7단계에서 동작과 모션 클래스 붙이기 → 5) 이 `work` 폴더를 지우는 PR을 올리고 병합(모든 작업의 마무리)이다.
규칙과 결정은 `.codocs`가 기준이다. 이 문서는 진행 상태와 이어서 할 일만 적는다.

## 기준 문서

- 모션 원칙·클래스·동작 줄이기: [[디자인 기반:모션]], [[디자인 기반:모션 클래스]], [[디자인 기반:모션 견본]]
- 피그마 견본 → json → 클래스 흐름, 키프레임 검사, 확인 방법: [[피그마 연동:모션]]
- PR 순서와 클래스를 붙이는 곳: [[피그마 연동:PR 흐름]]
- CI와 필수 검사: [[피그마 연동:CI]], [[Git 작업 규칙:CI]]
- 기능 쪽 동작: [[창 동작:창 조작]], [[작업 공간:다시 시작]], [[Start 메뉴:모두]], [[검색:입력칸]]
- 스킬: `.claude/skills/figma-motion-pr/SKILL.md`, `.claude/skills/figma-component-pr/SKILL.md`

## 끝난 것 (main에 병합됨)

| PR   | 내용                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| #165 | 모션 결정 문서                                                                                             |
| #166 | 자산 생성기: 속성 표 대신 규칙, `href` ID 접두어                                                           |
| #167 | CI 분리(`figma-generated.yml`), 캡처할 때 움직임 끄기                                                      |
| #168 | 모션 토대: EASING 토큰, `motion.css`, lint, 컴포넌트 전환 클래스 교체                                      |
| #169 | 플러그인 애니메이션 내보내기, `MotionPreview`, 모션 시간 검사, `motion-check.yml`, 스킬                    |
| #170 | 링 토큰(`motion/duration/progress-ring` 2000ms, `motion/easing/progress-ring`)                             |
| #171 | ProgressRing 새 호 자산(열린 원 경로 + `pathLength="1"` + `stroke-dasharray`)                              |
| #172 | `motion-progress-ring`(ProgressRing에 붙음, 실제로 돈다)                                                   |
| #173 | 플러그인: 트림 경로를 원 전체 경로 + 트림 기본값으로 직접 만듦(데스크톱 앱이 트림을 경로에 굽는 문제)      |
| #174 | 플러그인: 슬롯 노드의 `animations` 오류 수정, 글자 목록 문서                                               |
| #175 | SearchBox 돋보기: hover·포커스에서 컬러, 들어갈 때 faster 페이드, 나올 때 즉시(`motion-search-icon-state`) |
| #176 | `JumpListLetter` 컴포넌트                                                                                  |
| #178 | `motion-window-open`                                                                                       |
| #179 | `motion-window-close`                                                                                      |
| #190 | 플러그인: 키프레임 이징 연결도 "사용"으로 셈                                                               |
| #191 | 토큰: `font/family/latin` 삭제                                                                             |

GitHub ruleset `main: CI 통과 필수`의 필수 검사는 다섯 개다: `Lint, typecheck, test, build`, `E2E`, `Figma generated`, `Figma parity`, `Motion check`.

## 1. 남은 애니메이션 PR (스킬 `figma-motion-pr`로 차례대로)

모두 `packages/design-system/src/motion.css`를 고치므로 **하나씩** 처리한다. PR마다 `main`을 받아 오고(merge), 스킬대로 클래스와 `Motion/<json 이름>` 스토리를 만들고, 필수 검사 통과·캡처 표에 디자인 차이 없음을 확인한 뒤 병합하고 다음으로 넘어간다.

| PR   | 브랜치                                    | 클래스                         |
| ---- | ----------------------------------------- | ------------------------------ |
| #180 | `feat/figma-motion-window-minimize`       | `motion-window-minimize`       |
| #181 | `feat/figma-motion-window-restore`        | `motion-window-restore`        |
| #182 | `feat/figma-motion-window-snap`           | `motion-window-snap`           |
| #183 | `feat/figma-motion-panel-enter`           | `motion-panel-enter`           |
| #184 | `feat/figma-motion-panel-exit`            | `motion-panel-exit`            |
| #185 | `feat/figma-motion-flyout-enter`          | `motion-flyout-enter`          |
| #186 | `feat/figma-motion-boot-screen-enter`     | `motion-boot-screen-enter`     |
| #187 | `feat/figma-motion-boot-screen-exit`      | `motion-boot-screen-exit`      |
| #188 | `feat/figma-motion-start-jump-list-enter` | `motion-start-jump-list-enter` |
| #189 | `feat/figma-motion-start-jump-list-exit`  | `motion-start-jump-list-exit`  |

**#180은 작업하다 멈췄다.** 커밋하지 않은 변경이 worktree `E:\dev\seojaewan-blog\.claude\worktrees\agent-a3c44668f9466f4bd`(브랜치 `feat/figma-motion-window-minimize`)에 남아 있다.

- `packages/design-system/src/motion.css`(수정), `packages/design-system/src/motion-story/motion-window-minimize.stories.tsx`(새 파일): 이어서 쓰거나 버리고 새로 한다.
- `tools/figma-parity/src/zz-probe.spec.ts`, `tools/figma-parity/zz-probe.config.ts`: 확인용 임시 파일이다. 커밋하지 않고 지운다.
- 원격 #180 브랜치에는 아직 플러그인 커밋(json) 하나뿐이다.

이 PR들은 동작에 따라 붙는 움직임이라 **클래스와 스토리만** 만들고 컴포넌트에는 붙이지 않는다. 붙이는 것은 3번(7단계)이다.

### 구현할 때 알아 둘 것

- **이징은 요소 쪽에 둔다.** Chromium은 `@keyframes` 안의 `animation-timing-function: var()`를 무시한다. `animation-timing-function: var(--motion-easing-…)`를 요소에 두고, 트랙끼리 이징이 다르면(예: 배율 direct-entrance, 투명도 fade) `animation`을 쉼표로 여러 개 나눈다. 한 트랙 안에서 구간마다 다르면 멈추고 보고한다.
- **스토리 제목은 json 이름 그대로** `Motion/motion-…`이다. 모션 시간 검사가 이 제목으로 찾는다.
- **실행 중 값:** 최소화·복원의 도착·출발 위치, 스냅의 이전 위치·크기는 CSS 변수로 둔다([[디자인 기반:모션]] 표의 "실행 중 값" 열). 스토리에서는 json의 대표값을 넣는다.
  - 최소화·복원 대표값: 이동 (-380, 294), 배율 0.12
  - 스냅 대표값: 이동 (120, 60)에서 0으로, 배율 X 0.6·Y 0.7에서 1로
  - 패널: 아래로 720(패널 높이)
- **글자 목록(#188·#189):** 견본에는 `Start/JumpList` 조립 인스턴스와 목록 페이드용 `list` 레이어(`nodeKind: layer`) 트랙이 함께 있다. 시작 배율은 1.15다. 디자인 시스템 Storybook에는 앱 조립이 없으니 `JumpListLetter`와 `TileGrid`로 비슷하게 구성한다. 목록 페이드를 같은 클래스에 둘지 따로 둘지는 정해서 PR에 적는다.
- **동작 줄이기:** 창·패널·메뉴·글자 목록의 등장·퇴장, 최소화·최대화·스냅, 재부팅 화면 전환은 `motion.css`의 `prefers-reduced-motion` 블록에서 움직임 없이 바로 바뀌게 한다. 색 전환·돋보기·링 회전·재부팅 화면 시간(2500ms)은 그대로 둔다.
- **정지 모습을 클래스에 넣지 않는다.** 모션 클래스는 색·크기·위치 같은 정지 모습을 갖지 않는다. 그래야 캡처 표(움직임을 끄고 찍음)가 바뀌지 않는다. `motion.css`와 모션 스토리는 캡처 범위가 "없음"이다.

## 2. 조립 PR 처리 (1번 다음, 3번 전에)

사용자가 피그마 조립을 전부 내보내 영역마다 조립 PR(`feat/figma-patterns-<영역>`)을 열었다.

| PR   | 브랜치                         | 영역                                                                   |
| ---- | ------------------------------ | ---------------------------------------------------------------------- |
| #177 | `feat/figma-patterns-start`    | Start(글자 목록 `Start/JumpList`, `Start/Body`의 `View=JumpList` 포함) |
| #194 | `feat/figma-patterns-menu`     | 메뉴                                                                   |
| #195 | `feat/figma-patterns-chrome`   | Chrome                                                                 |
| #196 | `feat/figma-patterns-search`   | 검색                                                                   |
| #197 | `feat/figma-patterns-window`   | 창(Snap Assist 포함)                                                   |
| #198 | `feat/figma-patterns-taskbar`  | 작업 표시줄(창 미리보기 포함)                                          |
| #199 | `feat/figma-patterns-desktop`  | 바탕화면                                                               |
| #200 | `feat/figma-patterns-explorer` | 탐색기                                                                 |

창 축소 화면(작업 표시줄 창 미리보기, Snap Assist)은 실제 창 조립을 CSS `scale`로 줄여 그린다([[디자인 시스템:조립]]). 다른 영역의 조립(창 등)을 쓰는 조립은 그 조립이 먼저 코드에 있어야 하니, 쓰이는 쪽(예: 창, 메뉴)부터 처리한다.

- 스킬 `figma-component-pr`로 영역마다 처리한다. 앱(`apps/web`의 `features/`)에 조립 컴포넌트와 피그마 조립과 같은 데이터의 스토리를 만들고 캡처 표로 확인한다([[디자인 시스템:조립]], [[피그마 연동:스토리 규칙]]).
- 지금 앱에는 `features/`와 앱 Storybook 조립 스토리가 아직 없다. 첫 조립 PR 하나를 먼저 처리해 공통 틀(폴더 구조, 공통 데이터, 앱 Storybook 설정)을 잡은 뒤 나머지를 처리하면 충돌이 적다.
- 조립 PR은 모양과 스토리까지만 만들고, 동작(창 이동, 저장소, 열고 닫기)은 3번에서 붙인다.
- 문서 [[구현 순서:7단계 기능 구현]]은 "조립은 기능을 구현할 때 영역마다 내보낸다"고 되어 있어 이 순서와 다르다. "조립을 먼저 영역마다 내보내 앱 컴포넌트와 스토리를 만들고, 기능은 그 위에 붙인다"로 고칠지 사용자에게 확인하고 고친다(`.codocs` 변경은 허락이 필요하다).

## 3. 7단계 기능 구현 때 클래스 붙이기 (2번 조립 PR을 처리한 뒤)

붙일 대상(창·패널·Start 조립, 작업 공간 저장소)이 2번에서 생기므로 그 뒤에 한다.

| 할 일                    | 내용                                                                                                                                                                                                                                     | 기준                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `usePresence` 훅         | 앱 공통 훅. Base UI처럼 `data-starting-style`·`data-ending-style`을 붙이고 `element.getAnimations()`가 끝나면 요소를 뺀다. 기다릴 애니메이션이 없거나 `getAnimations`가 없는 환경(jsdom)이면 바로 뺀다                                   | [[디자인 기반:모션 클래스]] |
| 창 닫기                  | 저장소에서는 바로 지우고(다음 창이 바로 맨 앞으로) 화면에서만 `usePresence`로 남긴다                                                                                                                                                     | [[창 동작:창 조작]]         |
| 창 열기·닫기·최소화·복원 | 각 클래스 붙이기. 최소화·복원은 작업 표시줄 버튼 위치를 CSS 변수로 넘긴다                                                                                                                                                                |                             |
| 최대화·복원·스냅         | FLIP: 이전 위치·크기를 재고 → 바로 새 상태로 바꾸고 → transform으로 이전 자리에 맞춘 뒤 → `motion-window-snap`으로 되돌린다                                                                                                              | [[디자인 기반:모션 클래스]] |
| 드래그·크기 조절 중      | 움직임을 끈다                                                                                                                                                                                                                            |                             |
| Start·검색 패널          | `motion-panel-enter`·`exit`(`translateY`)                                                                                                                                                                                                |                             |
| 메뉴·메시지 상자         | Base UI 팝업에 `motion-flyout-enter`(같은 data 속성)                                                                                                                                                                                     |                             |
| Start 글자 목록          | 조립 PR **#177**(`feat/figma-patterns-start`, 열어 둠)을 Start 영역 구현 때 처리한다. `Start/JumpList` 조립과 `Start/Body`의 `View=JumpList` 변형. 글자를 고르면 목록이 그 글자로 이동한다. `motion-start-jump-list-enter`·`exit` 붙이기 | [[Start 메뉴:모두]]         |
| 다시 시작                | 재부팅 화면 덮기(`motion-boot-screen-enter`) → 다 덮은 뒤 Zustand 저장소 초기화·`persist` 지움·최상위 `key` 바꿔 다시 마운트(새로고침 없이) → 2500ms(`motion/delay/boot-screen`) → 걷기(`motion-boot-screen-exit`)                       | [[작업 공간:다시 시작]]     |
| E2E                      | Playwright 기본 `reducedMotion: 'reduce'`. 애니메이션 자체는 모션 시간 검사만 본다                                                                                                                                                       | [[테스트 작성 규칙:E2E]]    |

## 4. 피그마와 플러그인 참고

- 견본은 00 · Foundations의 `Motion` 섹션(`739:8229`)에 있다. 견본 이름 = 클래스 이름이고, 견본마다 자기 타임라인을 갖는다.
- 견본 노드 id: progress-ring `739:8230`, window-open `758:8`, window-close `758:50`, window-minimize `758:73`, window-restore `758:102`, window-snap `758:131`, panel-enter `758:174`, panel-exit `758:180`, flyout-enter `758:186`, boot-screen-enter `758:192`, boot-screen-exit `758:208`, start-jump-list-enter `758:236`, start-jump-list-exit `758:441`
- 링 호 자산 `progress-ring/Arc`(`356:23128`, 벡터 `739:5`)에 회전·트림 키프레임이 있다. ProgressRing 16·64 변형은 호 인스턴스를 배율(0.5·2)로 넣었고, 구조 검사는 배율 인스턴스의 크기를 `size/*` 값과 대조한다.
- 키프레임 시간·지연은 모션 변수 값과 대조하고, 이징은 `motion/easing/*` EASING 변수에 연결돼 있어야 내보낼 수 있다.
- 피그마 데스크톱 앱(126.10)은 트림을 경로에 구워 내보낸다. 플러그인(#173)이 원 전체 경로로 다시 만든다. 모션 기능이 꺼진 피그마 계정에서는 SVG 자산 내보내기가 실패한다.
- 정리 알림의 `font/weight/bold`(글 본문 굵은 글씨용), `opacity/drag-ghost`(7단계 끌기용)는 남겨 두기로 했다. 알림이 떠도 무시한다.
- 플러그인은 `pnpm --filter @seojaewan/figma-plugin build` 후 피그마 개발 플러그인 `seojaewan-blog figma export`로 실행한다.

## 5. 마무리

1~3번이 모두 끝나면 `.claude/work/` 폴더를 지우는 PR(예: `chore/remove-motion-work-doc`)을 `main`으로 올리고, 필수 검사가 통과하면 병합한다. 이것이 이 작업 전체의 마지막 단계다.
