---
name: codocs-only-decided-content
description: '.codocs에는 정해진 규칙만 적고, 새 결정 번호나 "~하기로 했다" 같은 경위 표현은 넣지 않는다'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 48fad2c8-9b1e-4cbf-befd-3665b489d760
  modified: 2026-10-23T01:34:54.041Z
---

`.codocs` 문서에는 결정된 내용(규칙)만 적는다. 대화에서 붙인 결정 번호(예: P1~P5)를 문서에 넣거나 "P1에서 ~하기로 했다"처럼 경위로 쓰지 않는다. 기존 D1~D9 같은 번호는 이미 코드 주석·위반 메시지와 연결돼 있어 그대로 둔다.

**Why:** 사용자가 개편안 초안(2026-10-23)에서 결정 번호를 문서에 넣으려 하자 "codocs는 결정된 내용만 들어간다"고 바로잡았다.
**How to apply:** 문서 초안을 쓸 때 규칙을 현재형 규칙 문장으로만 적고, 바뀐 이유가 필요하면 "검토한 대안"처럼 대안 설명으로 둔다. 관련: [[figma-parity-redesign]]
