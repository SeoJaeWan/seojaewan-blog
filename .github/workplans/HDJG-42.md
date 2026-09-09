# HDJG-42 — Pin·Taskbar·모바일 Window Foundation

최종 구현 범위와 검증을 안내한다. 상세 설계 규칙은 아래 canonical Memory 문서를 따른다.

Start와 Taskbar의 고정 목록·표시 순서·저장을 독립 Store로 구현하고 모바일 창 동작을 연결했다. 고정하지 않은 앱도 실행 중이면 표시되며, 마지막 창을 닫았다가 다시 실행하면 현재 목록 끝에 나타난다.

## 구현 범위

- StartStore: ResourceRef 고정·해제·순서 변경, 저장값 복원과 삭제된 원본 정리.
- TaskbarStore: Chrome·File Explorer 앱 및 외부 바로가기 고정, 고정/실행 중 항목의 통합 표시 순서, 고정 항목의 상대 순서만 저장.
- 앱별 Group의 대상은 WindowSession이다. 창 개수에 따른 실행·활성화·최소화·미리보기와 대상 ID를 고정한 전체 닫기 intent를 제공한다.
- 저장 실패 시 메모리 상태를 유지하고 실패 결과를 반환한다. 이전 저장 형식 이관과 실제 브라우저 탭 간 동기화는 제공하지 않는다.
- 모바일은 고정 File Explorer·Chrome 버튼과 시각 표시 모델, 전체화면 창 하나·탭 하나, 앱 전환과 명시적 닫기, 데스크톱 복귀 시 창 배치 보존을 처리한다.
- 공개 결과의 JSDoc과 기능 README를 보완하고, 개발 용어와 제품 개념을 설명하는 `docs/용어집.md`를 추가했다.

## 검증

- 검증된 구현 커밋 `e3b299c92eddb2fa983ca9bceb425705aabe5914`: design 테스트 348개, lint·타입 검사·빌드 통과.
- 루트 lint·typecheck·test를 캐시 없이 실행해 10개 작업 통과.
- Node 환경에서 브라우저 전역 객체 없이 dist import 통과.
- 이후 변경은 문서에 한정되며, 현재 구현 소스가 위 검증 커밋과 동일함을 확인했다. 문서 형식과 링크를 검증했다.

## 후속 계층의 범위

실제 drag·Context Menu·Preview UI, 애니메이션, 브라우저 localStorage·Next.js Application 연결과 해당 브라우저 검증은 후속 작업에서 다룬다. 이번 PR의 완료 범위는 headless Foundation이다.

## 관련 문서

- 설계 정본: Workbench Local Work Memory `seojaewan/seojaewan-blog`의 `pin-store-persistence`, `taskbar-pin-model`, `start-screen-pin-model`, `taskbar-group`, `taskbar-mobile`, `window-session`.
- 용어집의 역할과 기존 주석 방식은 `coding` Wiki에서 관리한다.
- 선행 작업: HDJG-41
- Jira: [HDJG-42](https://seojaewan.atlassian.net/browse/HDJG-42)
- PR: [#23](https://github.com/SeoJaeWan/seojaewan-blog/pull/23)
