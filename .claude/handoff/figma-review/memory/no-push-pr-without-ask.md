---
name: no-push-pr-without-ask
description: '작업이 끝나면 push·PR·병합을 하지 말고, 작업 내역을 예시와 함께 상세히 설명한 뒤 대기한다'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 48fad2c8-9b1e-4cbf-befd-3665b489d760
  modified: 2026-10-23T03:58:17.075Z
---

작업을 마치면 push, PR 열기, 병합, 다른 브랜치 받아오기 같은 바깥으로 나가는 일을 스스로 하지 않는다. 작업 내역을 구체적인 예시와 함께 상세히 설명하고 사용자의 다음 지시를 기다린다. "진행해" 같은 짧은 답은 그 직전에 물은 일(예: 문서 수정)만 허락한 것으로 본다.

**Why:** 2026-10-23 문서 보정을 "진행해"로 허락받은 뒤 feat/figma-parity-redesign을 push하고 PR #57을 열었다가, 사용자가 "누가 병합하라고 했냐, 작업 끝나면 상세히 설명하고 대기하라고 했잖아"라고 했다.
**How to apply:** 커밋까지는 로컬에서 하고, push/PR/병합은 사용자가 그 일을 명시해서 시킬 때만 한다. 끝난 뒤 보고는 무엇을 했는지, 예시, 남은 것 순서로 쓰고 멈춘다. 관련: [[figma-parity-redesign]]
