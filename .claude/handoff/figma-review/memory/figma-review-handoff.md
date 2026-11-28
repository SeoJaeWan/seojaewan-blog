---
name: figma-review-handoff
description: 피그마 디자인 시스템 검토를 이어 하는 법 — 2026-11-28 기준 상태, 답을 기다리는 물음 셋, 다음 일(부품 재정비), 인계 자료 위치
metadata:
  type: project
---

2026-11-28에 세션을 넘기며 적은 상태다. 방향은 [[assembly-as-container-and-flows]].

- 피그마 파일 키 `XV9Y1UT5UH4tC5hSqLVipZ`. 조립 여덟(Desktop, Taskbar, Start, Search, Chrome, Article, Explorer, Windows)을 조립마다 `Patterns / <이름>` 페이지에 그렸다. 왼쪽 열이 PC의 `흐름`·`키보드 흐름`, 오른쪽 열이 `모바일 흐름`·`모바일 키보드 흐름`. 노트북은 흐름도를 그리지 않는다.
- `.codocs`에 모두 반영했고 브랜치 `feat/figma-export-tools`에 커밋·푸시했다. 문서가 코드보다 앞서 있다(코드 할 일은 `.codocs/planning/todo.yaml`).
- 답을 기다리는 물음(하나씩 여쭌다, `todo.yaml`의 "정해야 할 것"에도 있음): (1) 모바일 탐색기 명령 모음에서 잘라내기·이름 바꾸기·삭제를 뺄지(내 의견은 뺌) (2) 접근성 패널 자리를 PC와 모바일이 따로 기억할지 (3) 폭 320 작업 표시줄에 버튼 다섯과 시계가 들어가는지(그려 보고 여쭐 것).
- 그다음 일: 부품(컴포넌트) 재정비. `todo.yaml`의 "부품을 재정비할 때 볼 것"과 부품 조사를 논의 목록으로 먼저 보여 주고 하나씩 논의한다.
- 인계 자료: 저장소의 `.claude/handoff/figma-review/`. `decisions.md`(모든 결정의 시간순 기록, 뒤의 것이 이김, 변형 id 포함), `keyboard-map.md`, `draw-flow-arrows.js`(세트 설명의 흐름 줄을 읽어 화살표를 그리는 스크립트), `mobile-survey.md`, `mobile-progress.md`, `parts-survey.json`(부품 76개 조사), `figma-state.json`(페이지·세트 id), `crop.swift`·`crop2.swift`(캡처 자르기).

**How to apply:** 이어 할 때 `decisions.md`의 끝부분과 `todo.yaml`을 먼저 읽는다. 피그마에 쓰기 전에 낱장을 직접 눈으로 확인하고 보여 준다([[verify-before-asking]]). 넘침·잘림은 숫자만 믿지 않는다.
