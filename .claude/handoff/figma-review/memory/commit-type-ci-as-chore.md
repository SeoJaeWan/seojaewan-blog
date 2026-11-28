---
name: commit-type-ci-as-chore
description: 'CI 설정(GitHub Actions 등) 변경 커밋도 `ci:`가 아니라 `chore:` 종류로 쓴다'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 48fad2c8-9b1e-4cbf-befd-3665b489d760
  modified: 2026-10-23T02:26:04.019Z
---

CI 워크플로 변경을 커밋할 때 Conventional Commits 종류를 `ci:`가 아니라 `chore:`로 쓴다.

**Why:** 2026-10-23 피그마 일치 검사 개편 작업 순서를 정할 때 사용자가 "ci도 chore로 해 커밋에서"라고 정했다. 저장소 기록에는 예전 `ci:` 커밋도 있다.
**How to apply:** `.github/workflows/` 등 CI 관련 변경은 `chore(...)`로 커밋한다. 브랜치 이름도 커밋 종류를 따르므로(Git 작업 규칙) CI 전용 브랜치면 `chore/`를 쓴다.
