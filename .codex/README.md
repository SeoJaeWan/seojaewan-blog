# Local documentation index

이 디렉터리는 프로젝트의 canonical wiki가 아니라 agent bootstrap, 근거 자료와 과거 작업
스냅샷을 보관한다.

## Source precedence

1. 저장소의 source와 실행 가능한 config는 실제 checkout 상태의 근거다.
2. 지속 가능한 architecture, convention, command와 development guide는 Workbench Local Work
   Memory가 canonical source다.
3. 현재 작업 상태와 후속 TODO는 Gateway Work Item catalog가 canonical source다.
4. `.codex`의 참고 문서가 위 source와 충돌하면 참고 문서를 현재 계약으로 해석하지 않는다.

## Local document roles

- `agent.md`: agent bootstrap과 knowledge precedence
- `architecture/`, `layout/`, `rules/`: legacy implementation과 migration 판단을 위한 reference
  snapshots
- `notion/inventory.md`: 원본 콘텐츠 구조를 조사한 evidence
- `notion/pipeline.md`: legacy pipeline design과 migration evidence
- `todo/`: 이전 구현의 backlog/completion snapshots; 현재 roadmap이 아님
- `fable5/`: 과거 작업의 retrospective와 operating history

새로운 지속 가능한 계약을 이 디렉터리에 복제하지 않는다. 구현 중 발견한 재사용 가능한 지식은
Local Work Memory에, 실행 가능한 후속 작업은 Work Item에 갱신한다.
