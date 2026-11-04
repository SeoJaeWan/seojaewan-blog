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
   - 컴포넌트 PR: @codocs [[디자인 시스템:컴포넌트 조립 규칙]], @codocs [[저장소 구성:디자인 시스템 패키지 구조]], @codocs [[디자인 시스템:아이콘 자리]]
   - 조립 PR: @codocs [[디자인 시스템:조립]], @codocs [[저장소 구성:앱 폴더 구조]]
   - 공통: @codocs [[피그마 연동:스토리 규칙]], @codocs [[피그마 연동:캡처 표]], @codocs [[피그마 연동:자산]], @codocs [[피그마 연동:토큰 생성]], @codocs [[컴포넌트 목록:상태]]
2. PR 브랜치를 받는다(`gh pr checkout <번호>`). `main` 대비 바뀐 파일이 @codocs [[피그마 연동:피그마 플러그인]]에서 이 PR이 바꾸는 파일뿐인지 확인한다. 예상 밖 파일이 있으면 멈추고 보고한다.
3. 대상의 변형과 속성, 쓰는 변수·스타일을 `export.json`의 레이어 트리와 PNG에서 확인하고, 그래도 모르는 것만 피그마 MCP로 본다. 둘이 다르면 `export.json`을 따르고 차이와 MCP로 메운 것을 보고한다(@codocs [[피그마 연동:스킬]]). 쓰는 토큰이 `figma/tokens.json`에 없으면 멈추고, 토큰 PR을 먼저 처리·병합한 뒤 이 PR에 `main`을 받아 와야 한다고 보고한다(@codocs [[피그마 연동:PR 흐름]]). 조립 PR이면 쓰는 디자인 시스템 컴포넌트가 코드에 모두 있는지도 확인한다.
4. `pnpm --filter @seojaewan/design-system generate:assets`를 실행하고, 바뀐 `src/assets/`를 커밋한다.
5. 구현한다.
   - 컴포넌트 PR: `src/components/<컴포넌트>/`에 코드와 `Figma` 스토리를 만들거나 고친다.
   - 조립 PR: 그 영역의 기능 폴더에 앱 컴포넌트와 스토리를 만든다. `export.json`과 피그마 조립 PNG는 구현 참고 자료다(배치, 쓰는 컴포넌트, 변형). 스토리 데이터를 피그마와 똑같이 맞추지 않아도 된다.
   - 값은 토큰 클래스로만 쓴다(@codocs [[피그마 연동:토큰 생성]]의 이름 규칙).
6. 캡처 도구를 로컬에서 돌린다(@codocs [[피그마 연동:CI]]). `pnpm --filter @seojaewan/figma-parity capture --target <컴포넌트 폴더나 조립 이름>`(예: `--target button`, `--target Menu/Folder`)을 실행하면 Storybook을 빌드하고 `tools/figma-parity/parity-results/<대상>/<변형>/`에 그림을 남긴다. Chromium이 없으면 `pnpm --filter @seojaewan/figma-parity exec playwright install chromium`을 먼저 실행한다. 스토리 짝을 찾지 못한 변형이 없어야 한다.
   - 컴포넌트 PR: 변형마다 `피그마 | 코드 | 차이`(`figma.png`, `code.png`, `diff.png`)를 본다. 차이 그림에서 엔진 차이가 아닌 차이가 보이면 5로 돌아가 고친다.
   - 조립 PR: 피그마와 비교하지 않는다. 캡처는 `parity-captures`에 병합 때 저장된 이전 코드 그림과 비교한 `이전 코드 | 지금 코드 | 차이`(`previous.png`, `code.png`, `diff.png`)다. 먼저 `git fetch origin parity-captures`로 이전 그림을 받는다. 이 차이로 의도하지 않은 변화(이 PR이 바꾸지 않으려던 배치가 움직임)만 확인하고, 그런 차이가 보이면 5로 돌아가 고친다. 의도한 변화는 그대로 두고 보고에 적는다. 이전 그림이 없는 새 조립과 새 변형은 지금 그림만 남는다. 로컬(Windows 등)에서 찍은 그림은 CI(Linux)에서 저장한 이전 그림과 글자 렌더링이 달라 글자 둘레가 옅게 밝을 수 있다. 피그마와 맞는지는 PR 본문의 피그마 그림과 지금 코드 그림을 사람이 비교해 본다.
7. 컴포넌트 PR에서 피그마 그림과 맞추려면 캡처 도구나 `figma/`를 바꿔야 할 것 같으면 멈추고, 어느 변형이 왜 그런지 보고한다.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`를 통과시킨다.
9. 커밋하고 푸시한다. 커밋 규칙은 @codocs [[Git 작업 규칙:커밋]]을 따른다. PR 브랜치에 이어서 커밋하고 병합하지 않는다.
10. 보고한다.
    - 변형마다 바꾼 것
    - 캡처 표에서 사람이 볼 곳: 차이 그림에 남은 차이와 그 이유, 캡처로 확인되지 않는 재질의 흐림 등(@codocs [[피그마 연동:캡처 표]])
    - 조립 PR: 이전 코드 그림과 달라진 곳 가운데 의도한 변화, 그리고 사람이 PR 본문의 피그마 그림과 비교해 볼 변형
