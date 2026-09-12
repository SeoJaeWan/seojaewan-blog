# HDJG-47 실행 안내

이 파일은 승인된 Prepare 범위와 현재 Memory를 찾기 위한 checkout 안내입니다. durable 계약 본문은
Workbench Local Work Memory project `seojaewan/seojaewan-blog`가 소유하고 delivery status와 후속 작업은
Gateway Work Item `HDJG-47`이 소유합니다.

- 승인된 Prepare: artifact `01a095dd-8519-7b05-be43-049bb343ceb8`, folder `prepare`
- 공통 검색: `resource-search` @ `01a095bf-efe4-7052-9527-f212ece70bc0`
- 제품 검색: `taskbar-search` @ `01a095c0-6f90-7378-88a9-821b0a62b27e`
- panel lifecycle: `taskbar-panel-lifecycle` @ `01a095c1-46c2-7f6e-9afc-3d52dd6c9a0d`
- 범위 합의: `hdjg-47-search-scope-decision` @ `01a095c2-0ce2-7d30-9e8e-6181cf8948bc`

TASK-003은 Start·Taskbar production 검색 본문, 입력·탐색 DOM, 인접 검사·Story와 시각 비교를 소유합니다.
Context Menu는 HDJG-49가 소유합니다. Application adapter와 개별 Window 화면 연결은 이 작업의 범위
밖입니다. Prepare의 사용자 결정은 승인되었으며 canonical Memory 변경 시 plan revision을 재검토합니다.

실행 중 발견한 실제 open 후 exit completion 연결 결함은 `CloseCompletionContract`로 검출합니다.
Search Operation 내부 primary panel settle handle이 UI transition registry에 전달되지 않아 실제 Popup
exit 완료 뒤 query/detail 초기화가 watchdog까지 늦어집니다. UI에서 API를 가로채거나 가짜 completion을
주입하지 않았습니다. headless owner가 정확한 transition identity 전달 경계를 보완해야 합니다.
