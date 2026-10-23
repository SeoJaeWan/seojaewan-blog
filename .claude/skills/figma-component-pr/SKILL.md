---
name: figma-component-pr
description: 피그마 플러그인이 연 컴포넌트 PR(`feat/figma-<컴포넌트>` 브랜치)을 처리할 때 쓴다. PR 번호를 받아 없는 토큰을 확인하고, 코드 자산을 생성하고, 피그마 일치 검사의 실패 목록대로 컴포넌트를 구현해 판정을 통과시킨 뒤 푸시한다. 사람이 "컴포넌트 PR #N 처리해 줘"처럼 맡길 때 실행한다.
---

# 피그마 컴포넌트 PR 처리

입력: `feat/figma-<컴포넌트>` PR 번호.

이 스킬은 절차만 담는다. 규칙은 아래 `@codocs [[문서:섹션]]` 링크가 가리키는 섹션에 있고, 실행할 때 codocs MCP의 `codocs_get`으로 그 섹션을 읽어 따른다. 규칙을 이 파일에 옮겨 적지 않는다.

이 스킬이 따르는 섹션: @codocs [[피그마 일치 검사:스킬]]

## 하지 않는 것

- `figma/` 고치기, `src/assets/` 손으로 고치기, 병합.
- 판정 도구(`scripts/parity/`) 고치기. 고쳐야 통과할 것 같으면 멈추고 보고한다.
- `.codocs` 고치기. 고쳐야 하면 무엇을 왜 바꿀지 사용자에게 제안하고 멈춘다(@codocs [[개발 컨벤션:작업 원칙]]).

## 절차

1. 문서를 읽는다.
   - @codocs [[피그마 일치 검사:판정 항목]]
   - @codocs [[피그마 일치 검사:짝짓기]]
   - @codocs [[피그마 일치 검사:스토리 규칙]]
   - @codocs [[피그마 일치 검사:글자]]
   - @codocs [[피그마 일치 검사:숨김 레이어]]
   - @codocs [[피그마 일치 검사:자산]]
   - @codocs [[피그마 일치 검사:상태 전환]]
2. PR 브랜치를 받는다(`gh pr checkout <번호>`). `main` 대비 바뀐 파일이 `figma/components/<컴포넌트>/`와 `figma/assets/`뿐인지 확인한다. 예상 밖 파일이 있으면 멈추고 보고한다.
3. `export.json`이 가리키는 변수·스타일 이름이 `figma/tokens.json`과 `src/tokens.css`에 모두 있는지 확인한다. 없는 토큰이 있으면 멈추고, 토큰 PR(`feat/figma-tokens`)을 먼저 처리·병합한 뒤 이 PR에 `main`을 받아 와야 한다고 보고한다(@codocs [[피그마 일치 검사:경우별 흐름]]).
4. `pnpm --filter @seojaewan/design-system generate:assets`를 실행하고, 바뀐 `src/assets/`를 커밋한다.
5. `pnpm --filter @seojaewan/design-system test:parity --component <컴포넌트>`로 판정 실패 목록을 얻는다. Chromium이 없으면 @codocs [[피그마 일치 검사:CI 비교]]의 설치 명령을 쓴다. 이 목록이 구현할 목록이다.
6. 실패 목록대로 구현한다. 새 컴포넌트면 `src/components/<컴포넌트>/` 폴더와 `Parity` 스토리부터 만든다(@codocs [[저장소 구성:디자인 시스템 패키지 구조]], @codocs [[피그마 일치 검사:스토리 규칙]]).
   - 레이어마다 `data-figma` 짝 요소
   - `Parity` 스토리의 args와 argTypes `options`
   - 토큰 이름 유틸리티 클래스(@codocs [[피그마 일치 검사:토큰 작성]]의 이름 규칙)
   - 상태(Hover·Pressed·Focus는 실제 상호작용, 나머지는 args)와 상태 전환
   - `--no-build` 없이 다시 실행해(스토리가 바뀌면 Storybook을 다시 빌드해야 한다) 실패가 없어질 때까지 반복한다.
7. 통과에 `scripts/parity/`나 `figma/`를 바꿔야 할 것 같으면 멈추고, 어느 실패가 왜 그런지 보고한다.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`를 통과시킨다.
9. 커밋하고 푸시한다. 커밋 규칙은 @codocs [[Git 작업 규칙:커밋]]을 따른다(Conventional Commits, 영어 제목, 한국어 본문). PR 브랜치에 이어서 커밋하고 병합하지 않는다.
10. 보고한다.
    - 변형마다 바꾼 것
    - 캡처 표에서 사람이 볼 곳: 판정하지 않는 크기 방식(HUG/FILL), 안쪽 선, 재질, 줄바꿈 등(@codocs [[피그마 일치 검사:캡처 표]])
