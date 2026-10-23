---
name: figma-component-pr
description: 피그마 플러그인이 연 컴포넌트 PR(`feat/figma-<컴포넌트>`)이나 조립 PR(`feat/figma-patterns-<영역>`)을 처리할 때 쓴다. PR 번호를 받아 없는 토큰을 확인하고, 코드 자산을 생성하고, 피그마 그림을 보고 컴포넌트나 앱 조립과 스토리를 구현한 뒤 캡처 표를 확인하고 푸시한다. 사람이 "컴포넌트 PR #N 처리해 줘"처럼 맡길 때 실행한다.
---

# 피그마 컴포넌트·조립 PR 처리

입력: `feat/figma-<컴포넌트>` 또는 `feat/figma-patterns-<영역>` PR 번호.

이 스킬은 절차만 담는다. 규칙은 아래 `@codocs \[[문서:섹션]]` 링크가 가리키는 섹션에 있고, 실행할 때 codocs MCP의 `codocs_get`으로 그 섹션을 읽어 따른다. 규칙을 이 파일에 옮겨 적지 않는다.

이 스킬이 따르는 섹션: @codocs [[피그마 연동:스킬]]

## 하지 않는 것

- @codocs [[피그마 연동:스킬]]에 적힌 하지 않는 것과 멈추는 경우를 따른다.
- `.codocs` 고치기. 고쳐야 하면 무엇을 왜 바꿀지 사용자에게 제안하고 멈춘다(@codocs [[개발 컨벤션:작업 원칙]]).

## 절차

1. 문서를 읽는다.
   - 컴포넌트 PR: @codocs [[디자인 시스템:컴포넌트 조립 규칙]], @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
   - 조립 PR: @codocs [[디자인 시스템:조립]], @codocs [[저장소 구성:앱 폴더 구조]]
   - 공통: @codocs [[피그마 연동:스토리 규칙]], @codocs [[피그마 연동:캡처 표]], @codocs [[피그마 연동:자산]], @codocs [[피그마 연동:토큰 생성]], @codocs [[컴포넌트 목록:상태]]
2. PR 브랜치를 받는다(`gh pr checkout <번호>`). `main` 대비 바뀐 파일이 @codocs [[피그마 연동:피그마 플러그인]]에서 이 PR이 바꾸는 파일뿐인지 확인한다. 예상 밖 파일이 있으면 멈추고 보고한다.
3. 피그마에서 대상의 변형과 속성, 쓰는 변수·스타일을 확인한다(피그마 MCP). 쓰는 토큰이 `figma/tokens.json`에 없으면 멈추고, 토큰 PR을 먼저 처리·병합한 뒤 이 PR에 `main`을 받아 와야 한다고 보고한다(@codocs [[피그마 연동:PR 흐름]]). 조립 PR이면 쓰는 디자인 시스템 컴포넌트가 코드에 모두 있는지도 확인한다.
4. `pnpm --filter @seojaewan/design-system generate:assets`를 실행하고, 바뀐 `src/assets/`를 커밋한다.
5. 구현한다.
   - 컴포넌트 PR: `src/components/<컴포넌트>/`에 코드와 `Parity` 스토리를 만들거나 고친다.
   - 조립 PR: 그 영역의 기능 폴더에 앱 컴포넌트와 피그마 조립과 같은 데이터의 스토리를 만든다.
   - 값은 토큰 클래스로만 쓴다(@codocs [[피그마 연동:토큰 생성]]의 이름 규칙).
6. 캡처 도구를 로컬에서 돌려 변형마다 `피그마 | 코드 | 차이`를 본다(@codocs [[피그마 연동:CI]]). `pnpm --filter @seojaewan/figma-parity capture --target <컴포넌트 폴더나 조립 이름>`(예: `--target button`, `--target Menu/Folder`)을 실행하면 Storybook을 빌드하고 `tools/figma-parity/parity-results/<대상>/<변형>/`에 `figma.png`, `code.png`, `diff.png`를 남긴다. Chromium이 없으면 `pnpm --filter @seojaewan/figma-parity exec playwright install chromium`을 먼저 실행한다. 차이 그림에서 엔진 차이가 아닌 차이가 보이면 5로 돌아가 고친다. 스토리 짝을 찾지 못한 변형이 없어야 한다.
7. 피그마 그림과 맞추려면 캡처 도구나 `figma/`를 바꿔야 할 것 같으면 멈추고, 어느 변형이 왜 그런지 보고한다.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`를 통과시킨다.
9. 커밋하고 푸시한다. 커밋 규칙은 @codocs [[Git 작업 규칙:커밋]]을 따른다. PR 브랜치에 이어서 커밋하고 병합하지 않는다.
10. 보고한다.
    - 변형마다 바꾼 것
    - 캡처 표에서 사람이 볼 곳: 차이 그림에 남은 차이와 그 이유, 캡처로 확인되지 않는 재질의 흐림 등(@codocs [[피그마 연동:캡처 표]])
