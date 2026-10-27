---
name: figma-motion-pr
description: 피그마 플러그인이 연 애니메이션 PR(`feat/figma-motion-<견본 이름에서 motion-을 뺀 이름>` 브랜치)을 처리할 때 쓴다. PR 번호를 받아 내보낸 `figma/motions/<이름>.json`과 디자인 기반 모션 표를 읽고, `motion.css`에 모션 클래스와 `Motion/<이름>` 모션 스토리를 만들고, 늘 붙는 움직임이면 컴포넌트에 붙인 뒤 모션 시간 검사를 통과시키고 푸시한다. 사람이 "애니메이션 PR #N 처리해 줘"처럼 맡길 때 실행한다.
---

# 피그마 애니메이션 PR 처리

입력: `feat/figma-motion-<견본 이름에서 motion-을 뺀 이름>` PR 번호(예: 견본 `motion-progress-ring` → `feat/figma-motion-progress-ring`).

이 스킬은 절차만 담는다. 규칙은 아래 `@codocs \[[문서:섹션]]` 링크가 가리키는 섹션에 있고, 실행할 때 codocs MCP의 `codocs_get`으로 그 섹션을 읽어 따른다. 규칙을 이 파일에 옮겨 적지 않는다.

이 스킬이 따르는 섹션: @codocs [[피그마 연동:스킬]]

## 하지 않는 것

- @codocs [[피그마 연동:스킬]]에 적힌 하지 않는 것과 멈추는 경우를 따른다.
- `.codocs` 고치기. 고쳐야 하면 무엇을 왜 바꿀지 사용자에게 제안하고 멈춘다(@codocs [[개발 컨벤션:작업 원칙]]).
- json의 시간·이징 값을 코드에 숫자로 옮기기. 토큰 짝은 `var()`로만 쓴다.
- 동작에 따라 붙는 움직임(창 열기·최소화, 패널 등)을 기능 코드에 붙이기. 클래스와 모션 스토리만 만든다(@codocs [[피그마 연동:PR 흐름]]).

## 멈추고 보고하는 경우

- PR에 `figma/motions/<이름>.json` 말고 다른 파일이 있다.
- json이 쓰는 모션 토큰이 `figma/tokens.json`에 없다. 토큰 PR을 먼저 처리·병합한 뒤 이 PR에 `main`을 받아 와야 한다.
- 키프레임이 걸린 컴포넌트나 자산(json `node`)이 코드에 아직 없다. 그 컴포넌트 PR을 먼저 병합해야 한다.
- 견본 이름이 @codocs [[디자인 기반:모션]] 표에 없거나, 표의 시간·이징과 json의 토큰 짝이 다르다.
- 한 트랙 안에서 구간마다 이징 토큰이 다르다. 이징은 요소 쪽 `animation-timing-function`에만 `var()`로 둘 수 있어(@codocs [[디자인 기반:모션 클래스]]) 한 animation 안에서 구간마다 다른 토큰을 쓸 수 없다. 옮기는 방법을 사람과 정한다.
- 모션 시간 검사를 통과시키려면 검사 도구나 `figma/`를 바꿔야 할 것 같다.

## 절차

1. 문서를 읽는다.
   - @codocs [[피그마 연동:모션]]
   - @codocs [[디자인 기반:모션]], @codocs [[디자인 기반:모션 클래스]], @codocs [[디자인 기반:모션 견본]]
   - @codocs [[디자인 기반:회전]]
   - @codocs [[피그마 연동:PR 흐름]], @codocs [[피그마 연동:CI]]
2. PR 브랜치를 받는다(`gh pr checkout <번호>`). `main` 대비 바뀐 파일이 @codocs [[피그마 연동:피그마 플러그인]]에서 애니메이션 PR이 바꾸는 파일뿐인지 확인한다.
3. json과 표를 읽는다.
   - json(`packages/design-system/figma/motions/<이름>.json`)에서 트랙마다 노드, 항목, 키프레임(시간, 위치, 값, 이징 토큰, 값 토큰), 트랙 길이와 시작 지연의 토큰을 정리한다. PR 본문의 키프레임 표와 토큰 짝 표도 같은 내용이다.
   - @codocs [[디자인 기반:모션]] 표에서 이 클래스의 행을 찾아 "실행 중 값" 열과 반복 여부를 읽는다. json에는 반복이 없다(피그마에서 읽을 수 없다).
   - 피그마 견본(PR 본문 링크)을 열어 키프레임 모양을 확인한다(피그마 MCP).
4. `packages/design-system/src/motion.css`에 `@keyframes`와 `@utility <이름>` 클래스를 만든다(@codocs [[디자인 기반:모션 클래스]]).
   - 클래스 이름은 json `name`(견본 이름)이다.
   - 토큰 짝(트랙 길이, 시작 지연, 이징, 값 토큰)은 `var(--motion-*)`로 쓴다. CSS 이름은 @codocs [[피그마 연동:토큰 생성]]의 규칙이다.
   - 시간·이징·지연은 요소의 `animation`(또는 `animation-duration`·`animation-timing-function`·`animation-delay`)에 `var()`로 쓴다. 요소 쪽 이징은 키프레임 구간마다 적용된다. `@keyframes` 안 `animation-timing-function`에는 `var()`를 쓰지 않는다(Chromium이 무시하고 `ease`로 재생한다).
   - 한 트랙의 구간 이징 토큰이 모두 같으면 그 토큰을 요소 쪽 `animation-timing-function`에 둔다. 구간마다 다르면 위 멈추는 경우다.
   - 실행 중 값은 CSS 변수로 받아 키프레임에서 쓴다. 변수 이름은 쓰임이 드러나게 짓는다.
   - 나머지 숫자(중간 키프레임 위치, 트림 값, 회전 각도 등)는 json 그대로 옮긴다. 키프레임 퍼센트는 json `offset`이다.
   - 회전(`ROTATION`)은 피그마 부호와 CSS 부호가 반대다(피그마 -720° → CSS `rotate: 720deg`).
   - 경로 트림(`PATH_TRIM_START`·`PATH_TRIM_END`)은 자산 SVG의 `pathLength="1"`을 기준으로 `stroke-dasharray`와 `stroke-dashoffset`으로 옮긴다.
   - 트랙끼리 이징(또는 길이·지연)이 다르면 `animation`을 쉼표로 여러 개 두고, 트랙마다 자기 `@keyframes`와 요소 쪽 이징을 쓴다. 예: `animation: <이름>-scale var(--motion-duration-normal) var(--motion-easing-direct-entrance) both, <이름>-fade var(--motion-duration-normal) var(--motion-easing-fade) both;`
   - 반복은 표대로 `animation-iteration-count`에 쓴다.
   - 동작 줄이기에서 바로 바꿀 움직임이면 `motion.css`의 `prefers-reduced-motion` 블록에 넣는다.
5. 모션 스토리를 만든다. `packages/design-system/src/motion-story/<이름>.stories.tsx`에 제목이 `Motion/<이름>`인 스토리를 두고, `motion-preview.tsx`의 `MotionPreview`로 견본과 같은 컴포넌트에 클래스를 걸어 재생한다. 실행 중 값은 `runtimeValues`에 견본의 대표값을 넣는다.
6. 컴포넌트에 늘 붙는 움직임(예: 링 회전)이면 같은 PR에서 그 컴포넌트에 클래스를 붙인다(@codocs [[피그마 연동:PR 흐름]]). 붙인 컴포넌트는 캡처 표를 받으므로 `pnpm --filter @seojaewan/figma-parity capture --target <컴포넌트 폴더>`로 정지 모습이 그대로인지 본다.
7. 모션 시간 검사를 로컬에서 돌린다: `pnpm --filter @seojaewan/figma-parity motion-check --motion <이름>`. 디자인 시스템 Storybook을 빌드하고 모션 스토리에서 시간·이징·지연을 읽어 json의 토큰 짝과 비교한다. Chromium이 없으면 `pnpm --filter @seojaewan/figma-parity exec playwright install chromium`을 먼저 실행한다. 실패하면 4·5로 돌아가 고친다. 로그의 반복 횟수가 표와 같은지도 본다.
8. Storybook에서 모션 스토리를 느리게 보기로 재생하며 피그마 견본과 키프레임 모양을 나란히 본다.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test`를 통과시킨다.
10. 커밋하고 푸시한다. 커밋 규칙은 @codocs [[Git 작업 규칙:커밋]]을 따른다. PR 브랜치에 이어서 커밋하고 병합하지 않는다.
11. 보고한다.
    - 만든 클래스와 키프레임, 토큰 짝을 `var()`로 쓴 곳, 실행 중 값 CSS 변수
    - 클래스를 붙인 컴포넌트(있으면)와 캡처 표에서 볼 곳
    - 모션 시간 검사 결과와 반복 횟수
    - 리뷰어가 피그마 견본과 모션 스토리를 나란히 볼 때 볼 곳(키프레임 모양은 사람이 본다)
